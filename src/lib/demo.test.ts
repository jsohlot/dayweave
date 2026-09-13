import { describe, expect, it } from 'vitest';
import { createDemoProvider } from './demo';
import { generatePlan } from './agent';
import { DEFAULT_PREFERENCES } from './defaults';
describe('isolated demo provider', () => {
  it.each(['busy','early','sparse'] as const)('loads %s as explicitly synthetic', async scenario => {
    const provider = createDemoProvider(scenario);
    const sources = await provider.loadSources('2026-09-14', DEFAULT_PREFERENCES);
    expect(provider.mode).toBe('demo');
    expect(sources.warnings.join(' ')).toMatch(/synthetic/i);
    if (scenario === 'sparse') expect(sources.receipts).toHaveLength(0);
  });
  it('applies only requested actions and is idempotent across a fresh plan', async () => {
    const provider = createDemoProvider('sparse');
    const options = { provider, date: '2026-09-14', preferences: DEFAULT_PREFERENCES };
    const plan = await generatePlan(options);
    const lunch = plan.actions.find(a => a.kind === 'lunch')!;
    expect((await provider.applyActions(plan, [lunch.id]))[0].status).toBe('created');
    const refreshed = await generatePlan(options);
    expect((await provider.applyActions(refreshed, [lunch.id]))[0].status).toBe('already_exists');
    expect(await provider.getActivity()).toHaveLength(1);
  });
  it('rechecks changed conflicts immediately before applying', async () => {
    const provider = createDemoProvider('sparse');
    const plan = await generatePlan({ provider, date: '2026-09-14', preferences: DEFAULT_PREFERENCES });
    const lunch = plan.actions.find(a => a.kind === 'lunch')!;
    await provider.applyActions(plan, [lunch.id]);
    const conflicting = { ...plan, actions: [{ ...lunch, id: 'different', kind: 'activity' as const }] };
    expect((await provider.applyActions(conflicting, ['different']))[0].status).toBe('conflict');
  });
  it('keeps preferences and action data isolated between provider instances', async () => {
    const a = createDemoProvider();
    const b = createDemoProvider();
    await a.savePreferences({ ...DEFAULT_PREFERENCES, name: 'Changed' });
    expect((await a.readPreferences())?.name).toBe('Changed');
    expect((await b.readPreferences())?.name).not.toBe('Changed');
  });
});
