import { DateTime } from 'luxon';
import type { MealIdea, MealIdeas, Preferences, Receipt } from '../types';

/** Curated optional ideas, not a nutrition assessment. External receipt text is never rendered here. */
export function buildMealIdeas(date: string, p: Preferences, receipts: Receipt[]): MealIdeas | undefined {
  if (p.foodGoal !== 'protein') return undefined;
  const end = DateTime.min(DateTime.fromISO(date, { zone: p.timeZone }).startOf('day'), DateTime.now());
  const start = end.minus({ days: 30 });
  const counts = new Map<Receipt['merchantKey'], number>();
  const seen = new Set<string>();
  for (const receipt of receipts.slice(0, 30)) {
    if (!receipt.merchantKey || seen.has(receipt.id)) continue;
    seen.add(receipt.id);
    const received = DateTime.fromISO(receipt.receivedAt, { setZone: true });
    if (!/(Z|[+-]\d\d:\d\d)$/.test(receipt.receivedAt) || !received.isValid || received >= end || received < start) continue;
    if (receipt.purchasedAt) {
      const purchased = DateTime.fromISO(receipt.purchasedAt, { setZone: true });
      if (!/(Z|[+-]\d\d:\d\d)$/.test(receipt.purchasedAt) || !purchased.isValid || purchased >= end || purchased < start || purchased > received.plus({ minutes: 5 })) continue;
    }
    counts.set(receipt.merchantKey, (counts.get(receipt.merchantKey) ?? 0) + 1);
  }
  // Free-text restrictions are not reliably machine-checkable; avoid guessing suitability.
  const restricted = Boolean(p.dietaryPreferences.trim());
  const catalog: { key: Receipt['merchantKey']; idea: Omit<MealIdea, 'receiptCount'> }[] = [
    { key: 'starbucks', idea: { merchant: 'Starbucks', kind: 'coffee', menuUrl: 'https://www.starbucks.com/discover/protein-drinks/', description: restricted ? 'Review the official menu and ingredients against your food preferences before choosing a drink.' : 'If it fits your preferences, consider a Vanilla Protein Latte during your coffee break. It contains milk. Check the current ingredients; recipes and availability vary.' } },
    { key: 'chipotle', idea: { merchant: 'Chipotle', kind: 'lunch', menuUrl: 'https://www.chipotle.com/high-protein-meals', description: restricted ? 'Review the official menu and ingredients against your food preferences before choosing lunch.' : 'For your lunch break, explore a bowl with beans or chicken as an optional way to include protein. Check ingredients and local availability.' } },
    { key: 'costco', idea: { merchant: 'Costco', kind: 'groceries', description: restricted ? 'Review labels against your food preferences on your next grocery trip. Receipts do not establish what is in your kitchen.' : 'On your next grocery trip, review labels for protein options you enjoy. No item-level quantities are available, so this is not a pantry assessment.' } },
  ];
  const ideas = catalog.filter(({ key }) => counts.has(key)).map(({ key, idea }) => ({ ...idea, receiptCount: counts.get(key)! }));
  const total = ideas.reduce((sum, idea) => sum + idea.receiptCount, 0);
  const coverage = `${total ? `${total} recent receipt${total === 1 ? '' : 's'} matched familiar merchant sender domains.` : 'No recent receipts matched the supported merchant sender domains.'} We check up to 30 relevant emails from the past 30 days. Receipts do not show what you ate, your protein intake, or whether purchases were shared; email arrival is not purchase or consumption time. Your chosen goal drives these ideas, not your meeting load. Confirm ingredients with the provider; allergy suitability is not assessed.`;
  return { ideas, coverage };
}
