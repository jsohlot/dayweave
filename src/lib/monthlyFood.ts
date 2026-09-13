export type FoodWeightBasis = 'dry' | 'cooked' | 'as-labeled';

type SharedInputs = {
 days: number;
 people: number;
 quantityBasis: FoodWeightBasis;
 labelBasis: FoodWeightBasis;
 carbsPer100g: number;
 equalSharing: boolean;
 dailyCarbTarget?: number | null;
};
export type MonthlyFoodInput = SharedInputs & (
 | { mode: 'purchase'; purchasedKg: number; consumedPercent: number }
 | { mode: 'inventory'; openingKg: number; purchasedKg: number; closingKg: number; wasteKg: number }
 | { mode: 'reported'; consumedKg: number }
);
export type MonthlyFoodResult =
 | { ok: false; error: string }
 | { ok: true; consumedKg: number; foodGramsPerPersonPerDay: number; carbsGramsPerPersonPerDay: number; targetContributionPercent: number | null };

const nonnegative = (value: number) => Number.isFinite(value) && value >= 0;

/** A conditional estimate for one food, not a measurement of a person's diet. */
export function calculateMonthlyFood(input: MonthlyFoodInput): MonthlyFoodResult {
 const invalid = (error: string): MonthlyFoodResult => ({ ok: false, error });
 if (!Number.isSafeInteger(input.days) || input.days < 1 || input.days > 31) return invalid('Enter a whole number of days from 1 to 31.');
 if (!Number.isSafeInteger(input.people) || input.people < 1) return invalid('Enter a positive whole number of people.');
 if (!input.equalSharing) return invalid('Confirm equal sharing to estimate an average per person.');
 if (!['dry', 'cooked', 'as-labeled'].includes(input.quantityBasis) || input.quantityBasis !== input.labelBasis) return invalid('Use the same basis for the food weight and nutrition label. Dry and cooked weights cannot be mixed.');
 if (!nonnegative(input.carbsPer100g) || input.carbsPer100g > 100) return invalid('Enter label carbohydrates from 0 to 100 grams per 100 grams of food.');
 const target = input.dailyCarbTarget;
 if (target != null && (!Number.isFinite(target) || target <= 0)) return invalid('Leave the target blank, or enter a positive daily carbohydrate target.');
 let consumedKg: number;
 switch (input.mode) {
  case 'purchase':
   if (!nonnegative(input.purchasedKg)) return invalid('Enter a nonnegative purchase amount in kilograms.');
   if (!nonnegative(input.consumedPercent) || input.consumedPercent > 100) return invalid('Explicitly enter the assumed fraction eaten, from 0 to 100 percent.');
   consumedKg = input.purchasedKg * (input.consumedPercent / 100);
   break;
  case 'inventory': {
   if (![input.openingKg, input.purchasedKg, input.closingKg, input.wasteKg].every(nonnegative)) return invalid('Enter all four inventory amounts as nonnegative kilograms.');
   const availableKg = input.openingKg + input.purchasedKg;
   const uneatenKg = input.closingKg + input.wasteKg;
   consumedKg = availableKg - uneatenKg;
   // Remove only floating-point subtraction noise, e.g. 0.3 - (0.1 + 0.2).
   const roundingTolerance = Number.EPSILON * Math.max(availableKg, uneatenKg) * 4;
   if (Number.isFinite(consumedKg) && Math.abs(consumedKg) <= roundingTolerance) consumedKg = 0;
   if (consumedKg < 0) return invalid('Closing stock plus waste or food given away cannot exceed opening stock plus purchases.');
   break;
  }
  case 'reported':
   if (!nonnegative(input.consumedKg)) return invalid('Enter the amount you report eaten as nonnegative kilograms.');
   consumedKg = input.consumedKg;
   break;
  default:
   return invalid('Choose how you are estimating the amount eaten.');
 }
 const foodGramsPerPersonPerDay = consumedKg * 1000 / input.people / input.days;
 const carbsGramsPerPersonPerDay = foodGramsPerPersonPerDay * (input.carbsPer100g / 100);
 const targetContributionPercent = target == null ? null : carbsGramsPerPersonPerDay / target * 100;
 if (![consumedKg, foodGramsPerPersonPerDay, carbsGramsPerPersonPerDay, targetContributionPercent ?? 0].every(Number.isFinite)) return invalid('These amounts are too large or too small to calculate reliably. Check the values.');
 return { ok: true, consumedKg, foodGramsPerPersonPerDay, carbsGramsPerPersonPerDay, targetContributionPercent };
}
