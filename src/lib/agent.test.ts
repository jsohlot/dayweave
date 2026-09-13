import { afterEach, describe, expect, it, vi } from 'vitest';
import { generatePlan } from './agent';
import { createDemoProvider } from './demo';
import { DEFAULT_PREFERENCES } from './defaults';
const opts = () => ({ date: '2026-09-14', preferences: { ...DEFAULT_PREFERENCES }, provider: createDemoProvider('busy') });
const answer = (parts: unknown[]) => new Response(JSON.stringify({ candidates: [{ content: { role: 'model', parts }, finishReason: 'STOP' }] }), { status: 200 });
afterEach(() => vi.unstubAllGlobals());
describe('read-only Gemini boundary', () => {
  it('works without a key and explicitly reports deterministic mode', async () => {
    vi.stubGlobal('fetch', () => { throw new Error('Must not call Gemini'); });
    const plan = await generatePlan(opts());
    expect(plan.aiUsed).toBe(false);
    expect(plan.trace.some(t => t.tool === 'gemini' && t.status === 'skipped')).toBe(true);
  });
  it('executes real tool-response loop while withholding sensitive free text and leaving actions untouched', async () => {
    const o = opts();
    o.preferences.name = 'DO_NOT_SEND_NAME';
    o.preferences.dietaryPreferences = 'DO_NOT_SEND_DIET';
    const baseline = await generatePlan(o);
    const bodies: string[] = [];
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      bodies.push(String(init.body));
      return bodies.length === 1 ? answer([{ functionCall: { name: 'read_validated_plan', args: {} } }]) : answer([{ text: '{"focus":"lunch","evidenceIds":["pref-lunch"]}' }]);
    });
    const plan = await generatePlan({ ...o, apiKey: 'test-secret-key' });
    expect(plan.aiUsed).toBe(true);
    expect(plan.actions).toEqual(baseline.actions);
    expect(bodies).toHaveLength(2);
    expect(bodies[1]).toContain('functionResponse');
    expect(bodies.join('')).not.toMatch(/DO_NOT_SEND|test-secret-key|Design review|Cafe/);
    expect(await o.provider.getActivity()).toEqual([]);
  });
  it('rejects injected mutation tools and never writes', async () => {
    vi.stubGlobal('fetch', async () => answer([{ functionCall: { name: 'applyActions', args: { actionIds: ['all'] } } }]));
    const o = opts();
    const plan = await generatePlan({ ...o, apiKey: 'test' });
    expect(plan.aiUsed).toBe(false);
    expect(plan.warnings.join(' ')).toMatch(/Gemini/);
    expect(await o.provider.getActivity()).toEqual([]);
  });
  it('bounds repeated read requests and reports fallback', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', async () => { calls++; return answer([{ functionCall: { name: 'read_preferences', args: {} } }]); });
    const plan = await generatePlan({ ...opts(), apiKey: 'test' });
    expect(calls).toBeLessThanOrEqual(3);
    expect(plan.aiUsed).toBe(false);
    expect(plan.warnings.join(' ')).toMatch(/Gemini/);
  });
  it('does not call AI or turn live source failure into a demo', async () => {
    const o = opts();
    o.provider.mode = 'live';
    o.provider.loadSources = async () => { throw new Error('Reconnect Calendar'); };
    await expect(generatePlan(o)).rejects.toThrow('Reconnect Calendar');
  });
});

describe('Gemini grounding and secret hygiene', () => {
  it('rejects evidence from another card', async () => {
    let request = 0;
    vi.stubGlobal('fetch', async () => ++request === 1 ? answer([{ functionCall: { name: 'read_validated_plan', args: {} } }]) : answer([{ text: '{"focus":"lunch","evidenceIds":["pref-coffee"]}' }]));
    expect((await generatePlan({ ...opts(), apiKey: 'test' })).aiUsed).toBe(false);
  });
  it('keeps API credentials out of URLs, plan objects, and transport error text', async () => {
    let requestUrl = '';
    let keyHeader = '';
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      requestUrl = url;
      keyHeader = new Headers(init.headers).get('x-goog-api-key') ?? '';
      throw new Error('bad response containing secret-only-in-header');
    });
    const plan = await generatePlan({ ...opts(), apiKey: 'secret-only-in-header' });
    expect(keyHeader).toBe('secret-only-in-header');
    expect(requestUrl).not.toContain('secret-only-in-header');
    expect(JSON.stringify(plan)).not.toContain('secret-only-in-header');
    expect(plan.aiUsed).toBe(false);
  });
  it('does not retain external prompt-injection text in tool responses', async () => {
    const o = opts();
    const original = o.provider.loadSources.bind(o.provider);
    o.provider.loadSources = async (...args) => {
      const sources = await original(...args);
      sources.events.forEach(e => { e.title = 'INJECT_CREATE_EVENTS'; e.location = 'PRIVATE_ADDRESS'; });
      sources.receipts.forEach(r => { r.merchant = 'INJECT_EMAIL_SECRETS'; r.items = ['PRIVATE_ITEM']; });
      return sources;
    };
    const bodies: string[] = [];
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      bodies.push(String(init.body));
      return bodies.length === 1 ? answer([{ functionCall: { name: 'read_calendar_schedule', args: {} } }, { functionCall: { name: 'read_receipt_patterns', args: {} } }, { functionCall: { name: 'read_validated_plan', args: {} } }]) : answer([{ text: '{"focus":"lunch","evidenceIds":["pref-lunch"]}' }]);
    });
    const plan = await generatePlan({ ...o, apiKey: 'test' });
    expect(plan.aiUsed).toBe(true);
    expect(bodies.join('')).not.toMatch(/INJECT_|PRIVATE_/);
  });
});

describe('Gemini 3.6 request compatibility', () => {
  it('uses the available default model and supported thinking settings across a signed tool loop', async () => {
    let requests = 0;
    const urls: string[] = [];
    const configs: Record<string, unknown>[] = [];
    let returnedSignature: unknown;
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      requests++;
      urls.push(url);
      const body = JSON.parse(String(init.body));
      configs.push(body.generationConfig);
      if (requests === 1) return answer([{ functionCall: { name: 'read_validated_plan', args: {}, id: 'call-1' }, thoughtSignature: 'opaque-signature' }]);
      returnedSignature = body.contents[1].parts[0].thoughtSignature;
      return answer([{ text: '{"focus":"lunch","evidenceIds":["pref-lunch"]}' }]);
    });
    const plan = await generatePlan({ ...opts(), apiKey: 'test' });
    expect(plan.aiUsed).toBe(true);
    expect(urls).toEqual(Array(2).fill('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent'));
    expect(configs.every(config => (config.thinkingConfig as Record<string, unknown>)?.thinkingLevel === 'MINIMAL')).toBe(true);
    expect(configs.every(config => !('thinkingBudget' in (config.thinkingConfig as Record<string, unknown>)))).toBe(true);
    expect(returnedSignature).toBe('opaque-signature');
  });
});
