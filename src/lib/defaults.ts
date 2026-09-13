import { DateTime } from 'luxon';
import type { Preferences } from '../types';
export const DEFAULT_PREFERENCES: Preferences = { name: 'Alex', timeZone: 'America/Los_Angeles', sleepHours: 8, windDownMinutes: 30, sleepLatencyMinutes: 15, morningMinutes: 45, commuteMinutes: 15, defaultWakeTime: '07:00', coffeeTime: '09:00', lunchTime: '12:30', lunchMinutes: 30, dietaryPreferences: '' };
export function tomorrowDate(zone = DEFAULT_PREFERENCES.timeZone, now = new Date()): string {
  const date = DateTime.fromJSDate(now, { zone }).plus({ days: 1 }).toISODate();
  if (!date) throw new Error('Choose a valid time zone.');
  return date;
}
