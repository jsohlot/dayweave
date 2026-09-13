import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import { buildPlan } from './planner';
import { DEFAULT_PREFERENCES, tomorrowDate } from './defaults';
import type { Preferences, SourceData, CalendarEvent, Receipt } from '../types';
const p: Preferences = { ...DEFAULT_PREFERENCES, timeZone: 'America/Los_Angeles', defaultWakeTime: '07:00', sleepHours: 8, sleepLatencyMinutes: 15, windDownMinutes: 30, morningMinutes: 45, commuteMinutes: 15, lunchTime: '12:30', lunchMinutes: 30 };
const source = (events: CalendarEvent[] = [], receipts: Receipt[] = []): SourceData => ({ events, receipts, warnings: [] });
const event = (start: string, end: string, allDay = false): CalendarEvent => ({ id: start, title: 'Commitment', start, end, allDay });
describe('safe deterministic planning', () => {
  it('keeps sparse histories preference-based and actions unselected', () => {
    const plan = buildPlan('2026-09-14', p, source());
    expect(plan.cards).toHaveLength(3);
    expect(plan.cards.find(c => c.kind === 'coffee')?.confidence).toBe('limited');
    expect(plan.actions.every(a => !a.selected)).toBe(true);
    expect(plan.aiUsed).toBe(false);
    expect(plan.actions.find(a => a.kind === 'sleep')?.end).toBe('2026-09-13T22:45:00.000-07:00');
  });
  it('uses an early commitment to move bedtime to the previous day', () => {
    const plan = buildPlan('2026-09-14', p, source([event('2026-09-14T06:00:00-07:00', '2026-09-14T07:00:00-07:00')]));
    expect(plan.actions.find(a => a.kind === 'sleep')?.end).toBe('2026-09-13T20:45:00.000-07:00');
  });
  it.each([['2026-03-08', '2026-03-07T21:45:00.000-08:00'], ['2026-11-01', '2026-10-31T23:45:00.000-07:00']])('preserves elapsed sleep across DST on %s', (date, bedtime) => {
    expect(buildPlan(date, p, source()).actions.find(a => a.kind === 'sleep')?.end).toBe(bedtime);
  });
  it('moves a conflicting lunch to the nearest complete gap', () => {
    const plan = buildPlan('2026-09-14', p, source([event('2026-09-14T12:00:00-07:00', '2026-09-14T13:30:00-07:00')]));
    expect(plan.actions.find(a => a.kind === 'lunch')?.start).toBe('2026-09-14T11:30:00.000-07:00');
    expect(plan.cards.find(c => c.kind === 'lunch')?.reasoning).toMatch(/conflict/i);
  });
  it.each([['America/Los_Angeles', '-07:00'], ['Asia/Kolkata', '+05:30']])('keeps lunch after a late wake in %s', (timeZone, offset) => {
    const plan = buildPlan('2026-09-14', { ...p, timeZone, defaultWakeTime: '14:00' }, source());
    const lunch = plan.actions.find(a => a.kind === 'lunch');
    expect(lunch?.start).toBe(`2026-09-14T14:00:00.000${offset}`);
    expect(lunch?.end).toBe(`2026-09-14T14:30:00.000${offset}`);
  });
  it.each(['14:45', '15:00', '16:00'])('offers no lunch when wake at %s leaves no complete lunch opening', defaultWakeTime => {
    const plan = buildPlan('2026-09-14', { ...p, defaultWakeTime }, source());
    expect(plan.actions.find(a => a.kind === 'lunch')).toBeUndefined();
    expect(plan.cards.find(c => c.kind === 'lunch')?.actionId).toBeUndefined();
    expect(plan.warnings).toContain('No conflict-free lunch slot was found.');
  });
  it('does not offer a lunch or coffee action in an all-day busy block', () => {
    const plan = buildPlan('2026-09-14', p, source([event('2026-09-14', '2026-09-15', true)]));
    expect(plan.actions.filter(a => a.kind === 'lunch' || a.kind === 'coffee')).toHaveLength(0);
  });
  it('does not invent a routine from delivery timestamps', () => {
    const receipts: Receipt[] = [1,2,3,4].map(n => ({ id: String(n), merchant: 'Cafe', category: 'coffee', purchasedAt: null, receivedAt: `2026-09-0${n}T18:00:00Z`, items: [], timeSource: 'email' }));
    const plan = buildPlan('2026-09-14', p, source([], receipts));
    expect(plan.cards.find(c => c.kind === 'coffee')?.confidence).toBe('limited');
    expect(plan.cards.find(c => c.kind === 'coffee')?.reasoning).toMatch(/received|delivery/i);
  });
  it('observes three distinct purchase days while keeping purchase distinct from consumption', () => {
    const receipts: Receipt[] = [1,2,3].map(n => ({ id: String(n), merchant: 'Cafe', category: 'coffee', purchasedAt: `2026-09-0${n}T09:10:00-07:00`, receivedAt: `2026-09-0${n}T19:00:00Z`, items: [], timeSource: 'receipt' }));
    const coffee = buildPlan('2026-09-14', p, source([], receipts)).cards.find(c => c.kind === 'coffee');
    expect(coffee?.confidence).toBe('observed');
    expect(coffee?.reasoning).toMatch(/consumption/i);
    expect(coffee?.timeLabel).toMatch(/9:10/);
  });
  it('rejects invalid preferences and nonexistent local DST time', () => {
    expect(() => buildPlan('2026-09-14', { ...p, sleepHours: NaN }, source())).toThrow();
    expect(() => buildPlan('2026-03-08', { ...p, defaultWakeTime: '02:30' }, source())).toThrow(/exist|clock|DST/i);
    expect(() => buildPlan('2026-02-30', p, source())).toThrow();
  });
  it('avoids previous-evening events when scheduling wind-down', () => {
    const plan = buildPlan('2026-09-14', p, source([event('2026-09-13T21:00:00-07:00', '2026-09-13T23:30:00-07:00')]));
    expect(plan.actions.find(a => a.kind === 'sleep')).toBeUndefined();
    expect(plan.warnings.join(' ')).toMatch(/sleep|wind-down/i);
  });
  it('calculates tomorrow in the chosen zone at a UTC date boundary', () => {
    expect(tomorrowDate('America/Los_Angeles', DateTime.fromISO('2026-09-14T01:00:00Z').toJSDate())).toBe('2026-09-14');
  });
});

describe('calendar and receipt evidence boundaries', () => {
  it('links the conflicting calendar evidence when coffee is moved', () => {
    const plan = buildPlan('2026-09-14', p, source([event('2026-09-14T08:00:00-07:00', '2026-09-14T10:00:00-07:00')]));
    const card = plan.cards.find(c => c.kind === 'coffee')!;
    expect(card.evidenceIds.some(id => plan.evidence.find(e => e.id === id)?.app === 'calendar')).toBe(true);
  });
  it('treats repeated receipts on one day as one observation', () => {
    const receipts: Receipt[] = [1,2,3].map(n => ({ id: String(n), merchant: 'Cafe', category: 'coffee', purchasedAt: '2026-09-01T09:10:00-07:00', receivedAt: '2026-09-01T19:00:00Z', items: [], timeSource: 'receipt' }));
    expect(buildPlan('2026-09-14', p, source([], receipts)).cards.find(c => c.kind === 'coffee')?.confidence).toBe('limited');
  });
  it('uses purchase times in the selected zone', () => {
    const receipts: Receipt[] = [1,2,3].map(n => ({ id: String(n), merchant: 'Cafe', category: 'coffee', purchasedAt: `2026-09-0${n}T16:10:00Z`, receivedAt: `2026-09-0${n}T19:00:00Z`, items: [], timeSource: 'receipt' }));
    expect(buildPlan('2026-09-14', p, source([], receipts)).cards.find(c => c.kind === 'coffee')?.timeLabel).toBe('9:10 AM');
  });
});

describe('shared preference boundaries', () => {
  it('rejects sleep below the UI and Google minimum and accepts the minimum', () => {
    expect(() => buildPlan('2026-09-14', { ...p, sleepHours: 3.5 }, source())).toThrow();
    expect(buildPlan('2026-09-14', { ...p, sleepHours: 4 }, source()).cards.find(c => c.kind === 'sleep')?.actionId).toBeDefined();
  });
  it('allows zero wind-down without creating an empty event or reporting a conflict', () => {
    const plan = buildPlan('2026-09-14', { ...p, windDownMinutes: 0 }, source());
    expect(plan.actions.find(a => a.kind === 'sleep')).toBeUndefined();
    expect(plan.cards.find(c => c.kind === 'sleep')?.actionId).toBeUndefined();
    expect(plan.cards.find(c => c.kind === 'sleep')?.reasoning).toMatch(/lights out/i);
    expect(plan.cards.find(c => c.kind === 'sleep')?.summary).not.toMatch(/winding down/i);
    expect(plan.warnings).toEqual([]);
    expect(plan.actions.every(a => new Date(a.end).getTime() > new Date(a.start).getTime())).toBe(true);
  });
});
