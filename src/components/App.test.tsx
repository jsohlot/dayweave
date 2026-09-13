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
vi.mock('../lib/google', () => ({ connectGoogle: async () => harness.live, loadGoogleIdentity: async () => {} }));
beforeEach(() => { harness.generation.mockClear(); harness.providers.length = 0; harness.live = null; });
afterEach(cleanup);
async function ready() { await screen.findByRole('button', { name: 'Review & add' }); }
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
