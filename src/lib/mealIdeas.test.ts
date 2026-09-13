import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildPlan, validatePreferences } from './planner';
import { DEFAULT_PREFERENCES } from './defaults';
import type { Preferences, Receipt } from '../types';
const p = { ...DEFAULT_PREFERENCES, foodGoal: 'protein' } as Preferences;
const receipt = (key: string, overrides = {}): Receipt => ({ id: key, merchant: key, merchantKey: key, category: 'meal', purchasedAt: '2026-09-12T12:00:00-07:00', receivedAt: '2026-09-12T12:10:00-07:00', timeSource: 'receipt', items: [], ...overrides } as Receipt);
const plan = (receipts: Receipt[], preferences = p) => buildPlan('2026-09-14', preferences, { events: [], receipts, warnings: [] });
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-13T15:00:00Z')); });
afterEach(() => vi.useRealTimers());
describe('opt-in food routines', () => {
 it('does not invent a food goal for old preferences', () => { expect(plan([receipt('starbucks')], DEFAULT_PREFERENCES).mealIdeas).toBeUndefined(); });
 it('requires a valid explicit goal', () => { expect(() => validatePreferences('2026-09-14', { ...p, foodGoal: 'deficiency' } as unknown as Preferences)).toThrow(/food goal/i); });
 it('turns observed familiar merchants into optional ideas without changing calendar actions', () => {
  const result = plan(['starbucks', 'chipotle', 'costco'].map(key => receipt(key)));
  expect(result.mealIdeas?.ideas.map(i => i.merchant)).toEqual(['Starbucks', 'Chipotle', 'Costco']);
  expect(result.mealIdeas?.ideas[0].description).toMatch(/Vanilla Protein Latte/);
  expect(result.mealIdeas?.ideas[0].description).toMatch(/milk/);
  expect(result.mealIdeas?.ideas[2].description).toMatch(/item-level/);
  expect(result.mealIdeas?.coverage).toMatch(/do not show what you ate/i);
  expect(result.actions).toEqual(plan([], DEFAULT_PREFERENCES).actions);
 });
 it('has an honest empty state and ignores a spoofed display name and unsafe receipt URL', () => {
  const result = plan([receipt('unknown', { merchant: 'Starbucks Costco Chipotle', merchantKey: undefined, sourceUrl: 'javascript:alert(1)' })]);
  expect(result.mealIdeas?.ideas).toEqual([]);
  expect(result.mealIdeas?.coverage).toMatch(/No recent receipts matched/i);
  expect(JSON.stringify(result.mealIdeas)).not.toContain('javascript:');
 });
 it('ignores future, stale, malformed, and duplicate observations', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-13T15:00:00Z'));
  const result = plan([
   receipt('starbucks', { purchasedAt: '2026-09-13T20:00:00Z' }),
   receipt('costco', { receivedAt: '2026-07-01T12:00:00Z', purchasedAt: '2026-07-01T12:00:00Z' }),
   receipt('chipotle', { receivedAt: 'bad' }),
   receipt('starbucks', { id: 'valid' }), receipt('starbucks', { id: 'valid' }),
  ]);
  expect(result.mealIdeas?.ideas).toHaveLength(1);
  expect(result.mealIdeas?.ideas[0].receiptCount).toBe(1);
 });
 it.each(['vegan', 'dairy allergy', 'no milk', 'vegetarian', 'custom restrictions'])('does not guess menu suitability for %s', restriction => {
  const result = plan(['starbucks', 'chipotle', 'costco'].map(key => receipt(key)), { ...p, dietaryPreferences: restriction });
  expect(result.mealIdeas?.ideas.every(i => /review/i.test(i.description))).toBe(true);
  expect(JSON.stringify(result.mealIdeas)).not.toMatch(/Vanilla Protein Latte|chicken|safe for/i);
 });
 it('can describe a recent receipt without pretending email arrival is purchase time', () => {
  const result = plan([receipt('starbucks', { purchasedAt: null, timeSource: 'email' })]);
  expect(result.mealIdeas?.ideas[0].receiptCount).toBe(1);
  expect(result.mealIdeas?.coverage).toMatch(/email arrival is not purchase/i);
 });
});
