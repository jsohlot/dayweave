// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MonthlyFoodEstimate } from './MonthlyFoodEstimate';

afterEach(cleanup);
function open() {
 render(<MonthlyFoodEstimate />);
 fireEvent.click(screen.getByText('Monthly estimate'));
}
function fill(label: string, value: string) {
 fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
function calculate() { fireEvent.click(screen.getByRole('button', { name: 'Calculate estimate' })); }
function example() { fireEvent.click(screen.getByRole('button', { name: 'Try a fictional example' })); }

it('starts blank and refuses to treat missing values as zero consumption', () => {
 open();
 expect((screen.getByLabelText('Purchased amount · kg') as HTMLInputElement).value).toBe('');
 expect((screen.getByLabelText('People sharing this food') as HTMLInputElement).value).toBe('');
 expect(screen.queryByRole('region', { name: 'Monthly estimate result' })).toBeNull();
 calculate();
 expect(screen.getByRole('alert')).toBeTruthy();
 expect(screen.queryByRole('region', { name: 'Monthly estimate result' })).toBeNull();
});
it('shows the fictional example as conditional per-person food and carbohydrate amounts', () => {
 open(); example(); calculate();
 expect(screen.getByText(/Fictional example/)).toBeTruthy();
 const result = within(screen.getByRole('region', { name: 'Monthly estimate result' }));
 expect(result.getByText('166.7 g')).toBeTruthy();
 expect(result.getByText('133.3 g')).toBeTruthy();
 expect(result.getByText(/User-reported amount/)).toBeTruthy();
 expect(result.getByText(/Shared evenly between 2 people over 30 days/)).toBeTruthy();
 expect(result.queryByText(/of your entered/)).toBeNull();
});
it('invalidates a result and preserves fictional provenance for remaining seeded values on edits', () => {
 open(); example(); calculate();
 fill('Amount reported eaten · kg', '5');
 expect(screen.queryByRole('region', { name: 'Monthly estimate result' })).toBeNull();
 expect(screen.getByText(/Edited fictional example/)).toBeTruthy();
 expect((screen.getByLabelText('Label carbohydrates · g per 100 g') as HTMLInputElement).value).toBe('80');
 calculate();
 expect(within(screen.getByRole('region', { name: 'Monthly estimate result' })).getByText('66.7 g')).toBeTruthy();
});
it('requires a matching cooked/dry label and the equal-sharing assumption', () => {
 open(); example();
 fill('Food weight basis', 'cooked'); calculate();
 expect(screen.getByRole('alert').textContent).toMatch(/same basis/);
 fill('Nutrition label basis', 'cooked');
 fireEvent.click(screen.getByRole('checkbox', { name: /Assume this food is shared equally/ }));
 calculate();
 expect(screen.getByRole('alert').textContent).toMatch(/equal sharing/);
 expect(screen.queryByRole('region', { name: 'Monthly estimate result' })).toBeNull();
});
it('makes purchase consumption explicitly assumed and requires its fraction', () => {
 open(); example();
 fill('Estimate from', 'purchase'); fill('Purchased amount · kg', '10');
 calculate();
 expect(screen.getByRole('alert').textContent).toMatch(/assumed fraction/);
 fill('Assumed fraction eaten · %', '50'); calculate();
 const result = within(screen.getByRole('region', { name: 'Monthly estimate result' }));
 expect(result.getByText(/Purchase-based scenario/)).toBeTruthy();
 expect(result.getByText(/50% of purchases assumed eaten/)).toBeTruthy();
 expect(result.getByText('66.7 g')).toBeTruthy();
});
it('subtracts stock and waste in inventory mode and rejects negative amounts eaten', () => {
 open(); example(); fill('Estimate from', 'inventory');
 fill('Opening stock · kg', '3'); fill('Purchased amount · kg', '10');
 fill('Closing stock · kg', '4'); fill('Waste or food given away · kg', '1'); calculate();
 const result = within(screen.getByRole('region', { name: 'Monthly estimate result' }));
 expect(result.getByText(/Inventory estimate/)).toBeTruthy();
 expect(result.getByText('106.7 g')).toBeTruthy();
 fill('Closing stock · kg', '20'); calculate();
 expect(screen.getByRole('alert').textContent).toMatch(/cannot exceed/);
 expect(screen.queryByRole('region', { name: 'Monthly estimate result' })).toBeNull();
});
it('shows optional target comparison only as this food contribution, and clears it when removed', () => {
 open(); example(); fill('Your daily total-carbohydrate target · g (optional)', '200'); calculate();
 expect(screen.getByText(/66.7% of your entered/)).toBeTruthy();
 expect(screen.getByText(/This compares only this food/)).toBeTruthy();
 fill('Your daily total-carbohydrate target · g (optional)', ''); calculate();
 expect(screen.queryByText(/of your entered/)).toBeNull();
});
it('clears all amounts and results on reset and does not retain them across mounts', () => {
 open(); example(); calculate(); fireEvent.click(screen.getByRole('button', { name: 'Clear amounts' }));
 expect(screen.queryByRole('region', { name: 'Monthly estimate result' })).toBeNull();
 expect((screen.getByLabelText('People sharing this food') as HTMLInputElement).value).toBe('');
 expect(screen.queryByText(/fictional example:/i)).toBeNull();
 example(); calculate(); cleanup(); open();
 expect((screen.getByLabelText('Purchased amount · kg') as HTMLInputElement).value).toBe('');
 expect(screen.queryByRole('region', { name: 'Monthly estimate result' })).toBeNull();
});
