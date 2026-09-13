import { DateTime } from 'luxon';
import type { ActivityRow, ApplyResult, CalendarEvent, Preferences, Provider, Receipt, TraceEntry } from '../types';
import { DEFAULT_PREFERENCES } from './defaults';
import { localTime, overlaps, validatePreferences } from './planner';

/** Synthetic, per-instance memory only. Never reads or writes a Google account or browser storage. */
export function createDemoProvider(scenario: 'busy' | 'early' | 'sparse' = 'busy'): Provider {
  let connected = true;
  let preferences = { ...DEFAULT_PREFERENCES };
  const created: CalendarEvent[] = [];
  const activity: ActivityRow[] = [];
  const applied = new Map<string, ApplyResult>();
  const ensureConnected = () => { if (!connected) throw new Error('This demo session is disconnected. Start a new demo to continue.'); };
  const emit = (tool: string, app: TraceEntry['app'], message: string, callback?: (t: TraceEntry) => void) => callback?.({ id: `${tool}-${Date.now()}`, tool, app, status: 'success', message, at: new Date().toISOString() });
  function fixtures(date: string, p: Preferences) {
    const at = (time: string) => localTime(date, time, p.timeZone).toISO()!;
    const ev = (id: string, title: string, start: string, end: string): CalendarEvent => ({ id: `demo-${id}`, title, start: at(start), end: at(end) });
    const events: CalendarEvent[] = scenario === 'sparse' ? [] : scenario === 'early' ? [ev('early', 'Early team handoff', '06:30', '07:15'), ev('lunch', 'Project check-in', '12:00', '12:45'), ev('walk', 'Evening walk', '17:30', '18:00')] : [ev('standup', 'Team check-in', '09:30', '10:00'), ev('review', 'Design review', '11:30', '12:30'), ev('workshop', 'Planning workshop', '12:30', '13:15'), ev('focus', 'Focus time', '14:00', '15:30')];
    const receipts: Receipt[] = scenario === 'sparse' ? [] : [2, 4, 6, 8, 10].map((days, i) => {
      const t = localTime(date, '09:00', p.timeZone).minus({ days }).plus({ minutes: [10, 0, 15, 5, 10][i] });
      return { id: `demo-receipt-${i}`, merchant: 'Juniper Coffee (sample)', category: 'coffee', purchasedAt: t.toISO(), receivedAt: t.plus({ minutes: 7 }).toISO()!, items: ['Coffee (synthetic receipt)'], timeSource: 'receipt' };
    });
    return { events: [...events, ...created.map(e => ({ ...e }))], receipts, warnings: ['Synthetic demo data. Actions and preferences stay in this demo session only.'] };
  }
  return {
    mode: 'demo',
    getConnections: () => ['gmail', 'calendar', 'sheets'].map(app => ({ app: app as 'gmail' | 'calendar' | 'sheets', connected, detail: 'Synthetic demo · memory only' })),
    async loadSources(date, p, onTrace) {
      ensureConnected();
      validatePreferences(date, p);
      const data = fixtures(date, p);
      emit('calendar.read', 'calendar', `Loaded ${data.events.length} synthetic calendar events.`, onTrace);
      emit('gmail.read', 'gmail', `Loaded ${data.receipts.length} synthetic receipts.`, onTrace);
      return data;
    },
    async readPreferences() { ensureConnected(); return { ...preferences }; },
    async savePreferences(p) { ensureConnected(); validatePreferences('2026-09-14', p); preferences = { ...p }; },
    async applyActions(plan, ids, onTrace) {
      ensureConnected();
      const results: ApplyResult[] = [];
      for (const id of [...new Set(ids)]) {
        const action = plan.actions.find(a => a.id === id);
        if (plan.mode !== 'demo' || !action) { results.push({ actionId: id, status: 'error', message: 'Choose an action from this demo plan.' }); continue; }
        const prior = applied.get(id);
        if (prior) { results.push({ ...prior, status: 'already_exists', message: 'Already reserved and logged in this demo session.' }); continue; }
        const start = DateTime.fromISO(action.start), end = DateTime.fromISO(action.end);
        if (!start.isValid || !end.isValid || end <= start || end.diff(start, 'hours').hours > 24) { results.push({ actionId: id, status: 'error', message: 'Invalid event timing.' }); continue; }
        const fresh = fixtures(plan.date, { ...preferences, timeZone: plan.timeZone }).events;
        if (fresh.some(e => overlaps(action.start, action.end, e, plan.timeZone))) { results.push({ actionId: id, status: 'conflict', message: 'A current calendar event overlaps this suggestion. Refresh your plan.' }); continue; }
        const eventId = `demo-${id}`;
        created.push({ id: eventId, title: action.title, start: action.start, end: action.end, isDayweave: true });
        activity.push({ actionId: id, date: plan.date, title: action.title, start: action.start, end: action.end, status: 'created', eventId, eventUrl: '' });
        const result: ApplyResult = { actionId: id, status: 'created', message: 'Reserved on the synthetic calendar and logged in demo memory.', eventId, logged: true };
        applied.set(id, result);
        results.push({ ...result });
        emit('calendar.create', 'calendar', 'Created the explicitly selected synthetic event.', onTrace);
        emit('sheets.log', 'sheets', 'Logged the synthetic action in demo memory.', onTrace);
      }
      return results;
    },
    async getActivity() { ensureConnected(); return activity.map(row => ({ ...row })); },
    getSpreadsheetUrl: () => undefined,
    disconnect() { connected = false; preferences = { ...DEFAULT_PREFERENCES }; created.length = 0; activity.length = 0; applied.clear(); },
  };
}
