import { describe, expect, it } from 'vitest';
import { calculateMonthlyFood, type MonthlyFoodInput } from './monthlyFood';

const example: MonthlyFoodInput = {
 mode: 'reported', consumedKg: 10, days: 30, people: 2,
 quantityBasis: 'dry', labelBasis: 'dry', carbsPer100g: 80,
 equalSharing: true, dailyCarbTarget: null,
};
function success(input: MonthlyFoodInput) {
 const result = calculateMonthlyFood(input);
 if (!result.ok) throw new Error(result.error);
 return result;
}

describe('monthly food estimate', () => {
 it('converts kg to grams and distributes one food across people and days', () => {
  const result = success(example);
  expect(result.consumedKg).toBe(10);
  expect(result.foodGramsPerPersonPerDay).toBeCloseTo(166.6666667);
  expect(result.carbsGramsPerPersonPerDay).toBeCloseTo(133.3333333);
  expect(result.targetContributionPercent).toBeNull();
 });
 it('uses only the explicitly assumed consumed fraction of purchases', () => {
  const result = success({ ...example, mode: 'purchase', purchasedKg: 10, consumedPercent: 25 });
  expect(result.consumedKg).toBe(2.5);
  expect(result.carbsGramsPerPersonPerDay).toBeCloseTo(33.3333333);
 });
 it('accounts for opening and closing inventory and food not eaten', () => {
  const result = success({ ...example, mode: 'inventory', openingKg: 3, purchasedKg: 10, closingKg: 4, wasteKg: 1 });
  expect(result.consumedKg).toBe(8);
  expect(result.carbsGramsPerPersonPerDay).toBeCloseTo(106.6666667);
 });
 it('rejects inventory that would imply negative consumption', () => {
  expect(calculateMonthlyFood({ ...example, mode: 'inventory', openingKg: 0, purchasedKg: 2, closingKg: 2, wasteKg: 1 }).ok).toBe(false);
 });
 it('handles decimal inventory balances without inventing negative consumption', () => {
  const result = success({ ...example, mode: 'inventory', openingKg: 0.3, purchasedKg: 0, closingKg: 0.1, wasteKg: 0.2 });
  expect(result.consumedKg).toBe(0);
  expect(calculateMonthlyFood({ ...example, mode: 'inventory', openingKg: 0.3, purchasedKg: 0, closingKg: 0.1, wasteKg: 0.200001 }).ok).toBe(false);
 });
 it('allows zero consumption and zero label carbohydrates', () => {
  expect(success({ ...example, consumedKg: 0 }).carbsGramsPerPersonPerDay).toBe(0);
  expect(success({ ...example, carbsPer100g: 0 }).carbsGramsPerPersonPerDay).toBe(0);
  expect(success({ ...example, mode: 'purchase', purchasedKg: 10, consumedPercent: 0 }).consumedKg).toBe(0);
 });
 it.each([NaN, Infinity, -Infinity, -1])('rejects invalid mass or label values %s', bad => {
  expect(calculateMonthlyFood({ ...example, consumedKg: bad }).ok).toBe(false);
  expect(calculateMonthlyFood({ ...example, carbsPer100g: bad }).ok).toBe(false);
  expect(calculateMonthlyFood({ ...example, mode: 'inventory', openingKg: bad, purchasedKg: 10, closingKg: 0, wasteKg: 0 }).ok).toBe(false);
  expect(calculateMonthlyFood({ ...example, mode: 'purchase', purchasedKg: bad, consumedPercent: 50 }).ok).toBe(false);
 });
 it.each([0, -1, NaN, Infinity, 1.5])('rejects invalid day/people divisors %s', bad => {
  expect(calculateMonthlyFood({ ...example, days: bad }).ok).toBe(false);
  expect(calculateMonthlyFood({ ...example, people: bad }).ok).toBe(false);
 });
 it('rejects impossible percentages and month day counts', () => {
  expect(calculateMonthlyFood({ ...example, carbsPer100g: 101 }).ok).toBe(false);
  expect(calculateMonthlyFood({ ...example, days: 32 }).ok).toBe(false);
  for (const consumedPercent of [-1, 101, NaN, Infinity]) {
   expect(calculateMonthlyFood({ ...example, mode: 'purchase', purchasedKg: 10, consumedPercent }).ok).toBe(false);
  }
 });
 it('does not silently convert between dry, cooked, or as-labeled weights', () => {
  for (const quantityBasis of ['dry', 'cooked', 'as-labeled'] as const) {
   for (const labelBasis of ['dry', 'cooked', 'as-labeled'] as const) {
    expect(calculateMonthlyFood({ ...example, quantityBasis, labelBasis }).ok).toBe(quantityBasis === labelBasis);
   }
  }
  expect(success({ ...example, quantityBasis: 'cooked', labelBasis: 'cooked', carbsPer100g: 28 }).carbsGramsPerPersonPerDay).toBeCloseTo(46.6666667);
 });
 it('requires the explicit equal-sharing assumption', () => {
  expect(calculateMonthlyFood({ ...example, equalSharing: false }).ok).toBe(false);
 });
 it('compares only this food contribution to an optional user target without clamping', () => {
  expect(success({ ...example, dailyCarbTarget: 200 }).targetContributionPercent).toBeCloseTo(66.6666667);
  expect(success({ ...example, dailyCarbTarget: 100 }).targetContributionPercent).toBeCloseTo(133.3333333);
  expect(success({ ...example, dailyCarbTarget: undefined }).targetContributionPercent).toBeNull();
  for (const dailyCarbTarget of [0, -1, NaN, Infinity]) {
   expect(calculateMonthlyFood({ ...example, dailyCarbTarget }).ok).toBe(false);
  }
 });
 it('rejects arithmetic overflow rather than returning nonfinite nutrition values', () => {
  expect(calculateMonthlyFood({ ...example, consumedKg: Number.MAX_VALUE }).ok).toBe(false);
  expect(calculateMonthlyFood({ ...example, dailyCarbTarget: Number.MIN_VALUE }).ok).toBe(false);
 });
});
