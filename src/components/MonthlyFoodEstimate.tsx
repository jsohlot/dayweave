import { useState } from 'react';
import { Calculator } from 'lucide-react';
import { calculateMonthlyFood, type FoodWeightBasis, type MonthlyFoodInput, type MonthlyFoodResult } from '../lib/monthlyFood';
import './MonthlyFoodEstimate.css';

type Draft = {
 mode: MonthlyFoodInput['mode']; food: string; days: string; people: string;
 quantityBasis: FoodWeightBasis | ''; labelBasis: FoodWeightBasis | '';
 carbsPer100g: string; dailyCarbTarget: string; equalSharing: boolean;
 purchasedKg: string; consumedPercent: string; openingKg: string; closingKg: string; wasteKg: string; consumedKg: string;
};
const blank: Draft = {
 mode: 'purchase', food: '', days: '', people: '', quantityBasis: '', labelBasis: '',
 carbsPer100g: '', dailyCarbTarget: '', equalSharing: false,
 purchasedKg: '', consumedPercent: '', openingKg: '', closingKg: '', wasteKg: '', consumedKg: '',
};
const number = (value: string) => value.trim() === '' ? NaN : Number(value);
const format = (value: number) => value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const basisNames = { dry: 'Dry', cooked: 'Cooked', 'as-labeled': 'As labeled' };

export function MonthlyFoodEstimate() {
 const [draft, setDraft] = useState<Draft>({ ...blank });
 const [fictional, setFictional] = useState<'pristine' | 'edited' | null>(null);
 const [result, setResult] = useState<MonthlyFoodResult | null>(null);
 function change<K extends keyof Draft>(key: K, value: Draft[K]) {
  setDraft(old => ({ ...old, [key]: value, ...(key === 'mode' ? { purchasedKg: '', consumedPercent: '', openingKg: '', closingKg: '', wasteKg: '', consumedKg: '' } : {}) }));
  setFictional(old => old ? 'edited' : null);
  setResult(null);
 }
 function calculate() {
  const shared = {
   days: number(draft.days), people: number(draft.people),
   quantityBasis: draft.quantityBasis as FoodWeightBasis, labelBasis: draft.labelBasis as FoodWeightBasis,
   carbsPer100g: number(draft.carbsPer100g), equalSharing: draft.equalSharing,
   dailyCarbTarget: draft.dailyCarbTarget.trim() === '' ? null : number(draft.dailyCarbTarget),
  };
  const input: MonthlyFoodInput = draft.mode === 'purchase'
   ? { ...shared, mode: 'purchase', purchasedKg: number(draft.purchasedKg), consumedPercent: number(draft.consumedPercent) }
   : draft.mode === 'inventory'
    ? { ...shared, mode: 'inventory', openingKg: number(draft.openingKg), purchasedKg: number(draft.purchasedKg), closingKg: number(draft.closingKg), wasteKg: number(draft.wasteKg) }
    : { ...shared, mode: 'reported', consumedKg: number(draft.consumedKg) };
  setResult(calculateMonthlyFood(input));
 }
 function tryExample() {
  setDraft({ ...blank, mode: 'reported', food: 'Rice', consumedKg: '10', days: '30', people: '2', quantityBasis: 'dry', labelBasis: 'dry', carbsPer100g: '80', equalSharing: true });
  setFictional('pristine');
  setResult(null);
 }
 function numericField(key: 'days' | 'people' | 'carbsPer100g' | 'dailyCarbTarget' | 'purchasedKg' | 'consumedPercent' | 'openingKg' | 'closingKg' | 'wasteKg' | 'consumedKg', label: string, min = 0, max?: number, step: number | 'any' = 'any') {
  return <label>{label}<input type="number" inputMode="decimal" value={draft[key]} min={min} max={max} step={step} onChange={e => change(key, e.target.value)} /></label>;
 }
 const modeDescription = draft.mode === 'purchase'
  ? 'Purchase-based scenario · the fraction eaten is an assumption, not actual consumption.'
  : draft.mode === 'inventory'
   ? 'Inventory estimate · opening stock + purchases − closing stock − waste or food given away.'
   : 'User-reported amount · the amount you say was eaten, not independently verified.';
 return <details className="monthly-food">
  <summary><span className="monthly-food-icon"><Calculator size={17} /></span><span><strong>Monthly estimate</strong><small>Explore one household food, with your assumptions.</small></span><span className="monthly-food-toggle" aria-hidden="true">+</span></summary>
  <div className="monthly-food-content">
   <p>Enter package amounts; receipts don’t establish consumption. This calculator stays on this page and isn’t saved or sent to an AI service.</p>
   <div className="monthly-food-example"><button type="button" className="text-button" onClick={tryExample}>Try a fictional example</button><button type="button" className="text-button" onClick={() => { setDraft({ ...blank }); setFictional(null); setResult(null); }}>Clear amounts</button></div>
   {fictional && <p className="monthly-food-fiction">{fictional === 'pristine' ? 'Fictional example: 10 kg of dry rice reported eaten by two people over 30 days. The 80 g carbohydrate label value is hypothetical; check your own package.' : 'Edited fictional example: verify every amount and label value. Unchanged example values are still hypothetical.'}</p>}
   <form noValidate onSubmit={e => { e.preventDefault(); calculate(); }}>
    <div className="monthly-food-fields">
     <label>Food name (optional)<input value={draft.food} maxLength={80} placeholder="e.g. rice" onChange={e => change('food', e.target.value)} /></label>
     <label>Estimate from<select value={draft.mode} onChange={e => change('mode', e.target.value as Draft['mode'])}><option value="purchase">Purchase-based scenario</option><option value="inventory">Inventory estimate</option><option value="reported">User-reported consumed quantity</option></select></label>
    </div>
    <p className="monthly-food-mode">{modeDescription}</p>
    <div className="monthly-food-fields">
     {draft.mode === 'inventory' && numericField('openingKg', 'Opening stock · kg')}
     {draft.mode !== 'reported' && numericField('purchasedKg', 'Purchased amount · kg')}
     {draft.mode === 'purchase' && numericField('consumedPercent', 'Assumed fraction eaten · %', 0, 100)}
     {draft.mode === 'inventory' && <>{numericField('closingKg', 'Closing stock · kg')}{numericField('wasteKg', 'Waste or food given away · kg')}</>}
     {draft.mode === 'reported' && numericField('consumedKg', 'Amount reported eaten · kg')}
     {numericField('days', 'Days in this month or period', 1, 31, 1)}
     {numericField('people', 'People sharing this food', 1, undefined, 1)}
     <label>Food weight basis<select value={draft.quantityBasis} onChange={e => change('quantityBasis', e.target.value as Draft['quantityBasis'])}><option value="">Choose a basis</option>{Object.entries(basisNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
     <label>Nutrition label basis<select value={draft.labelBasis} onChange={e => change('labelBasis', e.target.value as Draft['labelBasis'])}><option value="">Choose a basis</option>{Object.entries(basisNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
     {numericField('carbsPer100g', 'Label carbohydrates · g per 100 g', 0, 100)}
     {numericField('dailyCarbTarget', 'Your daily total-carbohydrate target · g (optional)')}
    </div>
    <p className="monthly-food-help">Use one weight basis for every amount and the matching label. “As labeled” means the exact food state on that package; dry and cooked weights aren’t interchangeable.</p>
    <label className="monthly-food-sharing"><input type="checkbox" checked={draft.equalSharing} onChange={e => change('equalSharing', e.target.checked)} /><span>Assume this food is shared equally across all people and days.</span></label>
    <button className="button secondary" type="submit">Calculate estimate</button>
   </form>
   {result && !result.ok && <p className="monthly-food-error" role="alert">{result.error}</p>}
   {result?.ok && <section className="monthly-food-result" aria-label="Monthly estimate result" aria-live="polite">
    <h3>{draft.food.trim() || 'This food'} · conditional estimate</h3>
    <p>{modeDescription}</p>
    {draft.mode === 'purchase' && <p>{draft.consumedPercent}% of purchases assumed eaten; this does not establish what anyone ate.</p>}
    <div className="monthly-food-totals"><div><strong>{format(result.foodGramsPerPersonPerDay)} g</strong><span>food per person per day</span></div><div><strong>{format(result.carbsGramsPerPersonPerDay)} g</strong><span>carbohydrates from this food per person per day</span></div></div>
    <p>{format(result.consumedKg)} kg over the period · {draft.quantityBasis} weight · {draft.carbsPer100g} g carbohydrate per 100 g.</p>
    <p>Shared evenly between {draft.people} people over {draft.days} days. Individual portions may differ.</p>
    {result.targetContributionPercent !== null && <p className="monthly-food-target">{format(result.targetContributionPercent)}% of your entered {draft.dailyCarbTarget} g daily target, from this food alone. This compares only this food; it does not assess your total diet or whether a target is appropriate.</p>}
   </section>}
   <p className="monthly-food-limits">Other foods, unequal portions, unrecorded stock changes, and food eaten elsewhere aren’t captured. These averages cannot establish dietary adequacy or excess.</p>
  </div>
 </details>;
}
