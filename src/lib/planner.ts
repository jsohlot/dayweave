import { DateTime } from 'luxon';
import { buildMealIdeas } from './mealIdeas';
import type { CalendarEvent, DayPlan, Evidence, Mode, PlanAction, PlanCard, Preferences, Receipt, SourceData } from '../types';

export function localTime(date: string, time: string, zone: string): DateTime {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Use a valid date and 24-hour clock time.');
  const value = DateTime.fromISO(`${date}T${time}`, { zone });
  if (!value.isValid || value.toISODate() !== date) throw new Error('Choose a valid date and time zone.');
  if (value.toFormat('HH:mm') !== time) throw new Error('That local clock time does not exist because of DST. Choose another time.');
  // For repeated fall-back wall times choose the earlier occurrence consistently.
  return value.getPossibleOffsets().sort((a, b) => a.toMillis() - b.toMillis())[0] ?? value;
}
export function validatePreferences(date: string, p: Preferences): void {
  if (p.foodGoal !== undefined && p.foodGoal !== 'none' && p.foodGoal !== 'protein') throw new Error('Choose a supported food goal.');
  for (const time of [p.defaultWakeTime, p.coffeeTime, p.lunchTime]) localTime(date, time, p.timeZone);
  const bounds: [number, number, number][] = [[p.sleepHours, 4, 12], [p.windDownMinutes, 0, 180], [p.sleepLatencyMinutes, 0, 120], [p.morningMinutes, 0, 240], [p.commuteMinutes, 0, 240], [p.lunchMinutes, 10, 120]];
  if (bounds.some(([n, min, max]) => !Number.isFinite(n) || n < min || n > max)) throw new Error('Check your sleep target and routine durations. One value is outside the supported range.');
}
function instant(value: string, zone: string): DateTime { return DateTime.fromISO(value, { zone }); }
export function overlaps(start: string, end: string, event: CalendarEvent, zone: string): boolean {
  const a = instant(start, zone).toMillis(), b = instant(end, zone).toMillis();
  const c = instant(event.start, zone).toMillis(), d = instant(event.end, zone).toMillis();
  return a < d && c < b;
}
function fmt(value: DateTime): string { return value.toFormat('h:mm a'); }
function iso(value: DateTime): string { return value.toISO()!; }
function free(start: DateTime, minutes: number, events: CalendarEvent[], zone: string): boolean {
  return !events.some(e => overlaps(iso(start), iso(start.plus({ minutes })), e, zone));
}
function nearestGap(preferred: DateTime, minutes: number, lower: DateTime, upper: DateTime, events: CalendarEvent[], zone: string): DateTime | null {
  const options: DateTime[] = [preferred];
  for (let t = lower; t.plus({ minutes }) <= upper; t = t.plus({ minutes: 5 })) options.push(t);
  return options.filter(t => t >= lower && t.plus({ minutes }) <= upper && free(t, minutes, events, zone))
    .sort((a, b) => Math.abs(a.toMillis() - preferred.toMillis()) - Math.abs(b.toMillis() - preferred.toMillis()) || a.toMillis() - b.toMillis())[0] ?? null;
}
export function coffeePattern(receipts: Receipt[], date: string, zone: string): { count: number; minutes: number | null; receivedOnly: number } {
  const target = localTime(date, '00:00', zone);
  const days = new Map<string, number[]>();
  let receivedOnly = 0;
  for (const r of receipts.slice(0, 30)) {
    if (r.category !== 'coffee') continue;
    if (r.timeSource !== 'receipt' || !r.purchasedAt || !/(Z|[+-]\d\d:\d\d)$/.test(r.purchasedAt)) { receivedOnly++; continue; }
    const t = instant(r.purchasedAt, zone).setZone(zone);
    if (!t.isValid || t >= target || t < target.minus({ days: 30 }) || t.hour < 5 || t.hour >= 12) continue;
    const key = t.toISODate()!;
    days.set(key, [...(days.get(key) ?? []), t.hour * 60 + t.minute]);
  }
  // One observation per day prevents repeated receipts for one purchase/day dominating the result.
  const observations = [...days.values()].map(values => Math.min(...values)).sort((a, b) => a - b);
  if (observations.length < 3) return { count: observations.length, minutes: null, receivedOnly };
  const mid = Math.floor(observations.length / 2);
  const median = observations.length % 2 ? observations[mid] : (observations[mid - 1] + observations[mid]) / 2;
  return { count: observations.length, minutes: Math.round(median / 5) * 5, receivedOnly };
}

export function buildPlan(date: string, p: Preferences, sources: SourceData, mode: Mode = 'demo'): DayPlan {
  validatePreferences(date, p);
  const day = localTime(date, '00:00', p.timeZone);
  const warnings = [...sources.warnings];
  const events = sources.events.filter(e => {
    const start = instant(e.start, p.timeZone), end = instant(e.end, p.timeZone);
    if (!start.isValid || !end.isValid || end <= start) throw new Error('Calendar returned an invalid busy interval. Refresh Calendar before planning.');
    return end > day.minus({ days: 1 }) && start < day.plus({ days: 1 });
  }).sort((a, b) => instant(a.start, p.timeZone).toMillis() - instant(b.start, p.timeZone).toMillis());
  const busy = events.filter(e => !e.isDayweave);
  const evidence: Evidence[] = [
    { id: 'pref-sleep', app: 'preferences', label: 'Your sleep target', detail: `${p.sleepHours} hours asleep, ${p.sleepLatencyMinutes} minutes to fall asleep, ${p.windDownMinutes} minutes to wind down.` },
    { id: 'pref-morning', app: 'preferences', label: 'Your morning buffer', detail: `${p.morningMinutes} minutes to get ready + ${p.commuteMinutes} minutes for travel; default wake ${p.defaultWakeTime}.` },
    { id: 'pref-coffee', app: 'preferences', label: 'Your coffee preference', detail: `Preferred routine at ${p.coffeeTime}. This is a scheduling preference, not a caffeine recommendation.` },
    { id: 'pref-lunch', app: 'preferences', label: 'Your lunch preference', detail: `${p.lunchMinutes} minutes around ${p.lunchTime}.` },
  ];
  busy.forEach((e, i) => evidence.push({ id: `calendar-${i}`, app: 'calendar', label: e.title || 'Busy time', detail: e.allDay ? 'All-day busy commitment.' : `${fmt(instant(e.start, p.timeZone).setZone(p.timeZone))}–${fmt(instant(e.end, p.timeZone).setZone(p.timeZone))}`, url: e.url }));
  const eventEvidence = (e: CalendarEvent) => `calendar-${busy.indexOf(e)}`;
  const actions: PlanAction[] = [];
  const cards: PlanCard[] = [];
  const add = (kind: PlanAction['kind'], title: string, description: string, start: DateTime, minutes: number, ids: string[]): string => {
    const end = start.plus({ minutes });
    const id = `${date}-${kind}-${start.toMillis()}-${end.toMillis()}`;
    actions.push({ id, kind, title, description, start: iso(start), end: iso(end), evidenceIds: ids, selected: false });
    return id;
  };
  const first = busy.find(e => !e.allDay && instant(e.start, p.timeZone) >= day && instant(e.start, p.timeZone) < day.plus({ hours: 12 }));
  const defaultWake = localTime(date, p.defaultWakeTime, p.timeZone);
  const commitmentWake = first ? instant(first.start, p.timeZone).minus({ minutes: p.morningMinutes + p.commuteMinutes }) : defaultWake;
  const wake = commitmentWake < defaultWake ? commitmentWake : defaultWake;
  const bedtime = wake.minus({ hours: p.sleepHours, minutes: p.sleepLatencyMinutes });
  const windDown = bedtime.minus({ minutes: p.windDownMinutes });
  const sleepIds = ['pref-sleep', 'pref-morning', ...(first ? [eventEvidence(first)] : [])];
  const sleepConflicts = busy.filter(e => overlaps(iso(windDown), iso(wake), e, p.timeZone));
  const sleepReason = `${p.windDownMinutes > 0 ? `Wind down at ${fmt(windDown)} on ${windDown.toFormat('LLL d')}; lights out at ${fmt(bedtime)}.` : `Lights out at ${fmt(bedtime)} on ${bedtime.toFormat('LLL d')}. No wind-down block requested.`} Wake at ${fmt(wake)} for ${p.sleepHours} hours of sleep plus ${p.sleepLatencyMinutes} minutes to fall asleep. ${first ? 'The first morning commitment and your preparation buffers are included.' : 'No timed morning commitment found; your preferred wake time is used.'}`;
  let sleepAction: string | undefined;
  if (!sleepConflicts.length && p.windDownMinutes > 0) sleepAction = add('sleep', 'Wind down for tomorrow', sleepReason, windDown, p.windDownMinutes, sleepIds);
  if (sleepConflicts.length) { warnings.push('A calendar commitment conflicts with the sleep window. Review it before reserving wind-down time.'); sleepIds.push(...sleepConflicts.map(eventEvidence)); }
  cards.push({ id: 'sleep', kind: 'sleep', title: 'Make room for rest', timeLabel: fmt(windDown), summary: sleepConflicts.length ? 'Your sleep window needs a closer look.' : p.windDownMinutes > 0 ? `Start winding down ${windDown.toFormat('LLL d')} for a ${fmt(wake)} wake-up.` : `Lights out at ${fmt(bedtime)} for a ${fmt(wake)} wake-up.`, reasoning: sleepReason, evidenceIds: [...new Set(sleepIds)], confidence: sleepConflicts.length ? 'limited' : first ? 'observed' : 'preference', actionId: sleepAction });

  const pattern = coffeePattern(sources.receipts, date, p.timeZone);
  evidence.push({ id: 'coffee-pattern', app: 'gmail', label: 'Coffee receipt timing', detail: `${pattern.count} distinct days with timestamped morning coffee purchases in the past 30 days. ${pattern.receivedOnly} receipts without usable purchase times. Purchase and email receipt times do not establish consumption time.` });
  const preferredCoffee = pattern.minutes === null ? localTime(date, p.coffeeTime, p.timeZone) : day.set({ hour: Math.floor(pattern.minutes / 60), minute: pattern.minutes % 60 });
  const coffeeLower = DateTime.max(localTime(date, '05:00', p.timeZone), wake);
  const coffee = nearestGap(preferredCoffee, 15, coffeeLower, localTime(date, '12:00', p.timeZone), busy, p.timeZone);
  const coffeeConflicts = busy.filter(e => overlaps(iso(preferredCoffee), iso(preferredCoffee.plus({ minutes: 15 })), e, p.timeZone));
  const coffeeIds = ['pref-coffee', 'coffee-pattern', ...coffeeConflicts.map(eventEvidence)];
  const coffeeReason = `${pattern.minutes === null ? 'Fewer than three distinct days of timestamped purchases; using your saved coffee time. Email received/delivery time is not a purchase time.' : `A typical morning purchase time appears across ${pattern.count} distinct days of receipt history.`} Purchase timing is not consumption timing. ${coffee && coffee.toMillis() !== preferredCoffee.toMillis() ? 'The suggested slot moves around busy calendar time.' : ''}`.trim();
  cards.push({ id: 'coffee', kind: 'coffee', title: 'Keep your morning familiar', timeLabel: coffee ? fmt(coffee) : 'Review morning', summary: coffee ? 'A small opening for your usual coffee routine.' : 'No clear 15-minute morning gap is available.', reasoning: coffeeReason, evidenceIds: coffeeIds, confidence: pattern.minutes === null ? 'limited' : 'observed', actionId: coffee ? add('coffee', 'Coffee break', coffeeReason, coffee, 15, coffeeIds) : undefined });

  const lunchPreferred = localTime(date, p.lunchTime, p.timeZone);
  const lunchBusy: CalendarEvent[] = [...busy, ...actions.map(a => ({ ...a, allDay: false }))];
  const lunch = nearestGap(lunchPreferred, p.lunchMinutes, localTime(date, '11:00', p.timeZone), localTime(date, '15:00', p.timeZone), lunchBusy, p.timeZone);
  const lunchConflicts = busy.filter(e => overlaps(iso(lunchPreferred), iso(lunchPreferred.plus({ minutes: p.lunchMinutes })), e, p.timeZone));
  const lunchIds = ['pref-lunch', ...lunchConflicts.map(eventEvidence)];
  const lunchReason = lunch ? `${lunchConflicts.length ? 'Your preferred lunch time has a calendar conflict. ' : ''}The nearest complete ${p.lunchMinutes}-minute opening is ${fmt(lunch)}–${fmt(lunch.plus({ minutes: p.lunchMinutes }))}. Calendar availability is checked again before saving.` : `No uninterrupted ${p.lunchMinutes}-minute gap was found between 11 AM and 3 PM. Review your calendar; no lunch action is proposed.`;
  cards.push({ id: 'lunch', kind: 'lunch', title: 'Give lunch a little space', timeLabel: lunch ? fmt(lunch) : 'No clear gap', summary: lunchConflicts.length ? 'Your usual lunch overlaps a commitment.' : lunch ? 'There is room to pause for lunch.' : 'The middle of your day is fully occupied.', reasoning: lunchReason, evidenceIds: lunchIds, confidence: lunch ? 'preference' : 'limited', actionId: lunch ? add('lunch', 'Lunch break', lunchReason, lunch, p.lunchMinutes, lunchIds) : undefined });
  if (!coffee) warnings.push('No conflict-free morning coffee slot was found.');
  if (!lunch) warnings.push('No conflict-free lunch slot was found.');
  return { id: `plan-${date}-${Date.now()}`, date, timeZone: p.timeZone, generatedAt: new Date().toISOString(), mode, headline: 'A little preparation. A calmer tomorrow.', summary: 'Your preferences, calendar openings, and available receipt timing shape these suggestions. Choose what you want to reserve.', cards, actions, evidence, events, trace: [], warnings, aiUsed: false, mealIdeas: buildMealIdeas(date, p, sources.receipts) };
}
