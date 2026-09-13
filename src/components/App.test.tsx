// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { GenerateOptions, Provider } from '../types';
import App from '../App';
const harness = vi.hoisted(() => ({ generation: vi.fn(), providers: [] as Provider[], live: null as Provider | null }));
vi.mock('../lib/demo', async importOriginal => {
 const original = await importOriginal<typeof import('../lib/demo')>();
 return { createDemoProvider: (scenario?: 'busy' | 'early' | 'sparse') => { const provider = original.createDemoProvider(scenario); vi.spyOn(provider, 'applyActions'); vi.spyOn(provider, 'savePreferences'); harness.providers.push(provider); return provider; } };
});
vi.mock('../lib/agent', async importOriginal => {
 const original = await importOriginal<typeof import('../lib/agent')>();
 return { generatePlan: (options: GenerateOptions) => { harness.generation(options); return original.generatePlan({ ...options, apiKey: undefined }); } };
});
vi.mock('../lib/google', () => ({ connectGoogle: async () => { if (!harness.live) throw new Error('Google sign-in was closed.'); return harness.live; }, loadGoogleIdentity: async () => {} }));
beforeEach(() => { harness.generation.mockClear(); harness.providers.length = 0; harness.live = null; });
afterEach(cleanup);
async function ready() { await screen.findByRole('button', { name: 'Review & add' }); }
it('clears household estimates when switching to another plan', async () => {
 render(<App/>); await ready();
 fireEvent.click(screen.getByText('Monthly estimate'));
 fireEvent.click(screen.getByRole('button', { name: 'Try a fictional example' }));
 fireEvent.click(screen.getByRole('button', { name: 'Calculate estimate' }));
 expect(screen.getByRole('region', { name: 'Monthly estimate result' }).textContent).toContain('133.3 g');
 fireEvent.change(screen.getByLabelText('Demo scenario'), { target: { value: 'sparse' } }); await ready();
 expect(screen.queryByRole('region', { name: 'Monthly estimate result' })).toBeNull();
 fireEvent.click(screen.getByText('Monthly estimate'));
 expect((screen.getByLabelText('Purchased amount · kg') as HTMLInputElement).value).toBe('');
 expect((screen.getByLabelText('People sharing this food') as HTMLInputElement).value).toBe('');
 expect(screen.queryByText(/Fictional example:/)).toBeNull();
 expect(harness.providers.every(provider => vi.mocked(provider.savePreferences).mock.calls.length === 0)).toBe(true);
});
it('keeps generation and review read-only until exact action confirmation', async () => {
 render(<App/>); await ready();
 const provider = harness.providers[0];
 expect(provider.savePreferences).not.toHaveBeenCalled(); expect(provider.applyActions).not.toHaveBeenCalled();
 const checkboxes = screen.getAllByRole('checkbox'); fireEvent.click(checkboxes[0]);
 fireEvent.click(screen.getByRole('button', { name: 'Review & add' }));
 expect(provider.applyActions).not.toHaveBeenCalled();
 const dialog = screen.getByRole('dialog');
 fireEvent.click(within(dialog).getByRole('button', { name: /Confirm & add/ }));
 await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
 expect(provider.applyActions).toHaveBeenCalledTimes(1); expect(provider.savePreferences).not.toHaveBeenCalled();
 expect((await provider.getActivity()).length).toBe(1);
 expect(within(screen.getByLabelText('Schedule and evidence')).getByText('Wind down for tomorrow')).toBeTruthy();
});
it('requires consent for AI and never persists a key', async () => {
 const storage = vi.spyOn(Storage.prototype, 'setItem');
 render(<App/>); await ready(); fireEvent.click(screen.getByRole('button', { name: 'Make it yours' }));
 fireEvent.change(screen.getByLabelText('Gemini API key'), { target: { value: 'synthetic-test-key' } });
 fireEvent.click(screen.getByRole('button', { name: 'Generate demo plan' })); await ready();
 expect(harness.generation.mock.lastCall?.[0].apiKey).toBeUndefined();
 fireEvent.click(screen.getByRole('button', { name: 'Make it yours' }));
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('checkbox')); fireEvent.click(screen.getByRole('button', { name: 'Generate demo plan' })); await ready();
 expect(harness.generation.mock.lastCall?.[0].apiKey).toBe('synthetic-test-key');
 fireEvent.change(screen.getByLabelText('Demo scenario'), { target: { value: 'sparse' } }); await ready();
 expect(harness.generation.mock.lastCall?.[0].apiKey).toBeUndefined();
 expect(storage).not.toHaveBeenCalled(); storage.mockRestore();
});
it('isolates real account preferences when disconnecting into synthetic demo', async () => {
 const { createDemoProvider } = await vi.importActual<typeof import('../lib/demo')>('../lib/demo');
 const live = createDemoProvider(); live.mode = 'live'; live.readPreferences = async () => ({ name: 'Private Account', dietaryPreferences: 'Private routine' }); harness.live = live;
 render(<App/>); await ready(); fireEvent.click(screen.getByRole('button', { name: 'Make it yours' }));
 fireEvent.change(screen.getByLabelText('Google OAuth client ID'), { target: { value: 'public.apps.googleusercontent.com' } });
 fireEvent.click(screen.getByRole('button', { name: /Connect Google/ }));
 await screen.findByText('Live Google account'); await ready(); expect(screen.getByText('Private Account')).toBeTruthy();
 fireEvent.click(screen.getByRole('button', { name: 'Connection' })); fireEvent.click(screen.getByRole('button', { name: 'Disconnect & return to demo' })); await ready();
 expect(screen.queryByText('Private Account')).toBeNull();
 expect(harness.generation.mock.lastCall?.[0].preferences.dietaryPreferences).toBe('');
});

it('keeps live source failures visible without substituting synthetic data', async () => {
 const { createDemoProvider } = await vi.importActual<typeof import('../lib/demo')>('../lib/demo');
 const live = createDemoProvider(); live.mode = 'live'; live.readPreferences = async () => null; live.loadSources = async () => { throw new Error('Calendar access expired. Reconnect Google.'); }; harness.live = live;
 render(<App/>); await ready(); fireEvent.click(screen.getByRole('button', { name: 'Make it yours' }));
 fireEvent.change(screen.getByLabelText('Google OAuth client ID'), { target: { value: 'public.apps.googleusercontent.com' } }); fireEvent.click(screen.getByRole('button', { name: /Connect Google/ }));
 await screen.findByText('Calendar access expired. Reconnect Google.');
 expect(screen.getByText('Live Google account')).toBeTruthy();
 expect(screen.queryByRole('button', { name: 'Review & add' })).toBeNull();
 expect(screen.queryByLabelText('Demo scenario')).toBeNull();
});

it('keeps food ideas opt-in, renders evidence after choosing a goal, and never silently saves preferences', async () => {
 render(<App/>);
 await screen.findByText('Keep your morning familiar');
 expect(screen.queryByText('A little protein, in familiar places.')).toBeNull();
 fireEvent.click(screen.getByRole('button', { name: 'Your routines' }));
 fireEvent.change(screen.getByLabelText('Food goal'), { target: { value: 'protein' } });
 fireEvent.click(screen.getByRole('button', { name: 'Use for this plan' }));
 await screen.findByText('A little protein, in familiar places.');
 expect(screen.getByRole('link', { name: /Starbucks menu/i }).getAttribute('href')).toBe('https://www.starbucks.com/discover/protein-drinks/');
 expect(screen.getByRole('link', { name: /Chipotle menu/i })).toBeTruthy();
 expect(harness.providers.at(-1)?.savePreferences).not.toHaveBeenCalled();
 expect(harness.providers.at(-1)?.applyActions).not.toHaveBeenCalled();
});

async function liveProvider(subject: string, name = 'Saved Account') {
 const { createDemoProvider } = await vi.importActual<typeof import('../lib/demo')>('../lib/demo');
 const live = createDemoProvider(); live.mode = 'live';
 Object.assign(live, { getAccountId: () => subject });
 live.readPreferences = vi.fn(async () => ({ name }));
 vi.spyOn(live, 'applyActions');
 return live;
}
async function connectLive(live: Provider) {
 harness.live = live; render(<App/>); await ready();
 fireEvent.click(screen.getByRole('button', { name: 'Make it yours' }));
 fireEvent.change(screen.getByLabelText('Google OAuth client ID'), { target: { value: 'public.apps.googleusercontent.com' } });
 fireEvent.click(screen.getByRole('button', { name: /Connect Google/ }));
 await screen.findByText('Live Google account'); await ready();
}
it('reconnects the same account without losing an unfinished approved plan or unsaved routines', async () => {
 const old = await liveProvider('account-a');
 vi.mocked(old.applyActions).mockImplementation(async (plan, ids) => ids.map(actionId => ({ actionId, status: 'created', eventId: `event-${actionId}`, logged: false, message: 'Google connection expired. Reconnect Google.' })));
 await connectLive(old);
 fireEvent.change(screen.getByLabelText('Plan date'), { target: { value: '2026-09-20' } }); await ready();
 fireEvent.click(screen.getByRole('button', { name: 'Your routines' }));
 fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Unsaved Account A' } });
 fireEvent.click(screen.getByRole('button', { name: 'Use for this plan' })); await ready();
 fireEvent.click(screen.getAllByRole('checkbox')[0]);
 fireEvent.click(screen.getByRole('button', { name: 'Review & add' }));
 fireEvent.click(screen.getByRole('button', { name: /Confirm & add/ }));
 await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
 const [originalPlan, originalIds] = vi.mocked(old.applyActions).mock.calls[0];
 const generationCount = harness.generation.mock.calls.length;
 const fresh = await liveProvider('account-a', 'Old saved name'); harness.live = fresh;
 fireEvent.click(screen.getByRole('button', { name: 'Connection' }));
 fireEvent.click(screen.getByRole('button', { name: 'Reconnect Google' }));
 await screen.findByText(/Reconnected.*Review/i);
 expect(screen.getByText('Unsaved Account A')).toBeTruthy();
 expect((screen.getByLabelText('Plan date') as HTMLInputElement).value).toBe('2026-09-20');
 expect(harness.generation).toHaveBeenCalledTimes(generationCount);
 expect(fresh.applyActions).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button', { name: 'Review & add' }));
 expect(fresh.applyActions).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button', { name: /Confirm & add/ }));
 await waitFor(() => expect(fresh.applyActions).toHaveBeenCalledTimes(1));
 expect(vi.mocked(fresh.applyActions).mock.calls[0][0].actions).toEqual(originalPlan.actions);
 expect(vi.mocked(fresh.applyActions).mock.calls[0][1]).toEqual(originalIds);
});
it('keeps the original plan when reconnect authorization fails', async () => {
 await connectLive(await liveProvider('account-a', 'Original Account'));
 const generationCount = harness.generation.mock.calls.length;
 harness.live = null;
 fireEvent.click(screen.getByRole('button', { name: 'Connection' }));
 fireEvent.click(screen.getByRole('button', { name: 'Reconnect Google' }));
 await screen.findAllByText('Google sign-in was closed.');
 expect(screen.getByText('Original Account')).toBeTruthy();
 expect(harness.generation).toHaveBeenCalledTimes(generationCount);
 fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
 expect(screen.getByRole('button', { name: 'Review & add' })).toBeTruthy();
});
it('clears account data and AI consent when reconnect selects a different account', async () => {
 await connectLive(await liveProvider('account-a', 'Private Account A'));
 fireEvent.click(screen.getByRole('button', { name: 'Connection' }));
 fireEvent.change(screen.getByLabelText('Gemini API key'), { target: { value: 'account-a-key' } });
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('checkbox'));
 harness.live = await liveProvider('account-b', 'Account B');
 fireEvent.click(screen.getByRole('button', { name: 'Reconnect Google' }));
 await screen.findByText('Account B'); await ready();
 expect(screen.queryByText('Private Account A')).toBeNull();
 expect(harness.generation.mock.lastCall?.[0].apiKey).toBeUndefined();
 expect(harness.generation.mock.lastCall?.[0].preferences.name).toBe('Account B');
 fireEvent.click(screen.getByRole('button', { name: 'Connection' }));
 expect((screen.getByLabelText('Gemini API key') as HTMLInputElement).value).toBe('');
 expect((within(screen.getByRole('dialog')).getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
});

it('requires a separate explicit confirmation before resetting missing-workbook recovery', async () => {
 const live = await liveProvider('account-a');
 const recover = vi.fn(async (replace = false) => replace ? 'reset' : 'confirmation_required');
 Object.assign(live, { recoverWorkbook: recover });
 vi.spyOn(live, 'savePreferences');
 await connectLive(live);
 fireEvent.click(screen.getByRole('button', { name: 'Connection' }));
 fireEvent.click(screen.getByRole('button', { name: 'Recover workbook' }));
 await screen.findByText(/could create an extra workbook/i);
 expect(recover.mock.calls).toEqual([[false]]);
 fireEvent.click(screen.getByRole('button', { name: 'Confirm replacement on next save' }));
 await screen.findAllByText(/next approved save or action/i);
 expect(recover.mock.calls).toEqual([[false], [true]]);
 expect(live.savePreferences).not.toHaveBeenCalled();
 expect(live.applyActions).not.toHaveBeenCalled();
});
