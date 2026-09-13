import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { connectGoogle, createGoogleProvider, GOOGLE_SCOPES } from './google';
import type { DayPlan, Preferences } from '../types';

const preferences: Preferences = { name: 'Demo', timeZone: 'America/Los_Angeles', sleepHours: 8, windDownMinutes: 30, sleepLatencyMinutes: 15, morningMinutes: 30, commuteMinutes: 20, defaultWakeTime: '07:00', coffeeTime: '08:00', lunchTime: '12:00', lunchMinutes: 30, dietaryPreferences: '' };
const plan: DayPlan = { id: 'plan', date: '2026-09-14', timeZone: preferences.timeZone, generatedAt: '2026-09-13T18:00:00Z', mode: 'live', headline: '', summary: '', cards: [], evidence: [], events: [], trace: [], warnings: [], aiUsed: false, actions: [{ id: 'lunch', kind: 'lunch', title: 'Lunch', description: 'Take a break', start: '2026-09-14T12:00:00-07:00', end: '2026-09-14T12:30:00-07:00', evidenceIds: [], selected: true }] };
type WireEvent = { id: string; summary?: string; status?: string; transparency?: string; start: {dateTime?: string; date?: string}; end: {dateTime?: string; date?: string}; htmlLink?: string; extendedProperties?: { private?: Record<string, string> } };
let calls: { url: URL; method: string; body: Record<string, any> | undefined }[];
let events: WireEvent[], activity: string[][], messages: Record<string, unknown>[], account: string;
let failAppend: boolean, lostAppendResponse: boolean, raceInsert: boolean, expired: boolean, calendarMore: boolean, lostWorkbookResponse: boolean;
let workbooks: {id:string;name:string}[];
let savedPreferences: unknown[][];
const storage = new Map<string, string>();
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: {'Content-Type':'application/json'} });

beforeEach(() => {
  calls = []; events = []; activity = []; messages = []; account = 'synthetic-account-a'; storage.clear();
  failAppend = false; lostAppendResponse = false; raceInsert = false; expired = false; calendarMore = false; lostWorkbookResponse = false; savedPreferences = []; workbooks = [];
  vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string,v: string) => storage.set(k,v), removeItem: (k: string) => storage.delete(k) });
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input), method = init?.method ?? 'GET', body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({url, method, body});
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-memory-token');
    if (expired) return response({}, 401);
    if (url.pathname.endsWith('/userinfo')) return response({sub: account, email: 'synthetic@example.test'});
    if (url.pathname.includes('/gmail/')) {
      if (url.pathname.endsWith('/messages')) return response({messages: messages.map((_, i) => ({id: String(i)}))});
      return response(messages[Number(url.pathname.split('/').at(-1))]);
    }
    if (url.pathname.includes('/calendar/')) {
      if (url.pathname.endsWith('/events')) {
        if (method === 'GET') return response({items: events, timeZone: 'America/Los_Angeles', ...(calendarMore ? {nextPageToken:'more'} : {})});
        events.push({...body, htmlLink: 'https://calendar.google.com/calendar/event?eid=synthetic'});
        if (raceInsert) return response({}, 409);
        return response(events.at(-1));
      }
      const event = events.find(e => e.id === url.pathname.split('/').at(-1));
      return event ? response(event) : response({}, 404);
    }
    if (url.pathname.endsWith('/files')) return response({files:workbooks});
    if (url.pathname.endsWith('/spreadsheets')) {
      workbooks.push({id:`sheet-${account}`,name:body.properties.title});
      if (lostWorkbookResponse) {lostWorkbookResponse=false;throw new TypeError('Failed to fetch');}
      return response({spreadsheetId: `sheet-${account}`});
    }
    if (decodeURIComponent(url.pathname).includes('Activity')) {
      if (method === 'GET') return response({values: activity});
      if (failAppend) { failAppend = false; return response({}, 503); }
      activity.push(...body.values);
      if (lostAppendResponse) { lostAppendResponse = false; throw new TypeError('Failed to fetch'); }
      return response({updates:{updatedRows:1}});
    }
    if (decodeURIComponent(url.pathname).includes('Preferences')) {
      if (method === 'PUT') savedPreferences = body.values;
      return response({values: savedPreferences});
    }
    return response({values: []});
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe('Google provider read boundaries', () => {
  it('reads without creating any workbook, and scopes lookup to the Google subject', async () => {
    storage.set('dayweave:google:synthetic-account-b:spreadsheet', 'other-sheet');
    const provider = createGoogleProvider('test-memory-token');
    expect(await provider.readPreferences()).toBeNull();
    expect(await provider.getActivity()).toEqual([]);
    expect(calls.every(c => c.method === 'GET')).toBe(true);
    expect(calls.some(c => c.url.href.includes('other-sheet'))).toBe(false);
    expect([...storage.values()]).not.toContain('test-memory-token');
  });
  it('creates both Sheets tabs only on explicit preference save', async () => {
    const provider = createGoogleProvider('test-memory-token');
    await provider.savePreferences(preferences);
    const create = calls.find(c => c.url.pathname.endsWith('/spreadsheets') && c.method === 'POST');
    expect(create?.body?.sheets.map((s: any) => s.properties.title)).toEqual(['Preferences', 'Activity']);
    expect(provider.getSpreadsheetUrl()).toContain('sheet-synthetic-account-a');
    expect(calls.find(c => c.method === 'PUT')?.url.searchParams.get('valueInputOption')).toBe('RAW');
  });
  it('keeps all-day dates in calendar timezone and excludes cancelled/free events', async () => {
    events = [
      {id:'all-day',summary:'Away',start:{date:'2026-09-14'},end:{date:'2026-09-15'}},
      {id:'cancelled',status:'cancelled',start:{date:'2026-09-14'},end:{date:'2026-09-15'}},
      {id:'free',transparency:'transparent',start:{date:'2026-09-14'},end:{date:'2026-09-15'}},
    ];
    const result = await createGoogleProvider('test-memory-token').loadSources(plan.date, preferences);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({allDay:true,start:'2026-09-14T00:00:00.000-07:00',end:'2026-09-15T00:00:00.000-07:00'});
    expect(calls.find(c => c.url.pathname.endsWith('/events'))?.url.searchParams.get('singleEvents')).toBe('true');
  });
  it('recursively decodes receipt MIME, uses real purchase timestamps, never invents one from email delivery', async () => {
    const encoded = (s: string) => btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    messages = [
      {id:'0', internalDate:'1789300800000', payload:{headers:[{name:'Subject',value:'Coffee receipt'},{name:'From',value:'Cafe <cafe@example.test>'}],parts:[{mimeType:'multipart/alternative',parts:[{mimeType:'text/plain',body:{data:encoded('Purchased at: 2026-09-12T08:35:00-07:00\nLatte')}}]}]}},
      {id:'1', internalDate:'1789300800000', payload:{headers:[{name:'Subject',value:'Coffee receipt'}],body:{data:encoded('Thanks for your coffee order!')}}},
    ];
    const result = await createGoogleProvider('test-memory-token').loadSources(plan.date, preferences);
    expect(result.receipts[0]).toMatchObject({merchant:'Cafe',category:'coffee', purchasedAt:'2026-09-12T08:35:00.000-07:00',timeSource:'receipt'});
    expect(result.receipts[1]).toMatchObject({purchasedAt:null,timeSource:'email',receivedAt:'2026-09-13T12:00:00.000Z'});
    expect(calls.find(c => c.url.pathname.endsWith('/messages'))?.url.searchParams.get('maxResults')).toBe('30');
    expect(result.receipts[0].sourceUrl).toContain('authuser=synthetic%40example.test');
  });
  it('reports expired authorization and clears connection state', async () => {
    expired = true;
    const provider = createGoogleProvider('test-memory-token');
    await expect(provider.readPreferences()).rejects.toThrow(/expired|reconnect/i);
    expect(provider.getConnections().every(c => !c.connected)).toBe(true);
  });
  it('disconnect prevents any more API calls', async () => {
    const provider = createGoogleProvider('test-memory-token'); provider.disconnect();
    await expect(provider.readPreferences()).rejects.toThrow(/connect/i);
    expect(calls).toHaveLength(0);
  });
  it('round-trips preferences, keeps spreadsheet values literal, and rejects invalid persisted data', async () => {
    const provider = createGoogleProvider('test-memory-token');
    await provider.savePreferences({...preferences,name:'=IMPORTXML("https://example.test", "x")'});
    expect(await provider.readPreferences()).toMatchObject({...preferences,name:'=IMPORTXML("https://example.test", "x")'});
    savedPreferences = [['sleepHours','100'],['timeZone','Moon/Base'],['coffeeTime','25:70'],['name','Alex'],['__proto__','bad']];
    expect(await provider.readPreferences()).toEqual({name:'Alex'});
  });
  it('bounds Gmail message fetches even if the server returns more than requested', async () => {
    messages = Array.from({length:60},(_,i) => ({id:String(i),internalDate:'1789300800000',payload:{headers:[{name:'Subject',value:'Coffee receipt'}]}}));
    const result = await createGoogleProvider('test-memory-token').loadSources(plan.date,preferences);
    expect(result.receipts).toHaveLength(30);
    expect(calls.filter(c => /\/messages\/\d+$/.test(c.url.pathname))).toHaveLength(30);
  });
  it('preserves a 25-hour all-day busy interval over fall DST', async () => {
    events = [{id:'dst-away',start:{date:'2026-11-01'},end:{date:'2026-11-02'}}];
    const result = await createGoogleProvider('test-memory-token').loadSources('2026-11-01',preferences);
    expect(new Date(result.events[0].end).getTime() - new Date(result.events[0].start).getTime()).toBe(25 * 60 * 60 * 1000);
  });
  it('does not use timezone-free receipt dates or email date headers as purchase instants', async () => {
    messages = [{id:'0',internalDate:'1789300800000',payload:{headers:[{name:'Subject',value:'Coffee receipt'},{name:'Date',value:'Sun, 13 Sep 2026 08:00:00 -0700'}],body:{data:btoa('Purchased at: 2026-09-12 08:35')}}}];
    const result = await createGoogleProvider('test-memory-token').loadSources(plan.date,preferences);
    expect(result.receipts[0]).toMatchObject({purchasedAt:null,timeSource:'email'});
  });
  it('rejects expired tokens locally without sending a request', async () => {
    const provider = createGoogleProvider('test-memory-token', Date.now()-1);
    await expect(provider.readPreferences()).rejects.toThrow(/expired/i);
    expect(calls).toHaveLength(0);
  });
  it('forgets a deleted workbook during reads and creates a replacement only on explicit save', async () => {
    storage.set('dayweave:google:synthetic-account-a:spreadsheet','deleted-sheet');
    const originalFetch = fetch;
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => String(url).includes('/deleted-sheet/') ? Promise.resolve(response({},404)) : originalFetch(url,init)));
    const provider = createGoogleProvider('test-memory-token');
    expect(await provider.readPreferences()).toBeNull();
    expect(provider.getSpreadsheetUrl()).toBeUndefined();
    expect(calls.every(c => c.method === 'GET')).toBe(true);
    await provider.savePreferences(preferences);
    expect(provider.getSpreadsheetUrl()).toContain('sheet-synthetic-account-a');
  });
  it('reconciles an uncertain workbook creation after reload without creating a second workbook', async () => {
    lostWorkbookResponse = true;
    await expect(createGoogleProvider('test-memory-token').savePreferences(preferences)).rejects.toThrow();
    const next = createGoogleProvider('test-memory-token');
    expect(await next.readPreferences()).toBeNull();
    expect(workbooks).toHaveLength(1);
    await next.savePreferences(preferences);
    expect(workbooks).toHaveLength(1);
    expect(await next.readPreferences()).toEqual(preferences);
    expect(next.getSpreadsheetUrl()).toContain('sheet-synthetic-account-a');
  });
  it('does not repeat uncertain creation while Drive listing is still empty', async () => {
    lostWorkbookResponse = true;
    await expect(createGoogleProvider('test-memory-token').savePreferences(preferences)).rejects.toThrow();
    const originalFetch = fetch;
    vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => String(url).includes('/drive/v3/files') ? Promise.resolve(response({files:[]})) : originalFetch(url,init)));
    await expect(createGoogleProvider('test-memory-token').savePreferences(preferences)).rejects.toThrow(/unconfirmed/i);
    expect(workbooks).toHaveLength(1);
  });
  it('requires a durable recovery marker before creating a workbook', async () => {
    vi.stubGlobal('localStorage', {getItem: () => null,setItem: () => {throw new Error('QuotaExceededError');}});
    await expect(createGoogleProvider('test-memory-token').savePreferences(preferences)).rejects.toThrow(/browser storage/i);
    expect(workbooks).toHaveLength(0);
  });
});

describe('approved Calendar writes', () => {
  it('does nothing with an empty approval and rejects unknown action IDs', async () => {
    const provider = createGoogleProvider('test-memory-token');
    expect(await provider.applyActions(plan, [])).toEqual([]);
    expect((await provider.applyActions(plan, ['unknown']))[0].status).toBe('error');
    expect(calls).toHaveLength(0);
  });
  it('rechecks fresh conflicts before creating either a Calendar event or workbook', async () => {
    events = [{id:'new-meeting',start:{dateTime:plan.actions[0].start},end:{dateTime:plan.actions[0].end}}];
    const result = await createGoogleProvider('test-memory-token').applyActions(plan, ['lunch']);
    expect(result[0].status).toBe('conflict');
    expect(calls.every(c => c.method === 'GET')).toBe(true);
  });
  it('creates deterministic IDs, deduplicates repeat approvals, and logs only once', async () => {
    const provider = createGoogleProvider('test-memory-token');
    const first = await provider.applyActions(plan, ['lunch', 'lunch']);
    const second = await createGoogleProvider('test-memory-token').applyActions({...plan,id:'new-plan',actions:[{...plan.actions[0],id:'new-action'}]}, ['new-action']);
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({status:'created', logged:true});
    expect(second[0]).toMatchObject({status:'already_exists', logged:true,eventId:first[0].eventId});
    expect(first[0].eventId).toMatch(/^[0-9a-v]{5,1024}$/);
    expect(events).toHaveLength(1); expect(activity).toHaveLength(1);
    const insert = calls.find(c => c.method === 'POST' && c.url.pathname.endsWith('/events'));
    expect(insert?.body?.attendees).toBeUndefined();
    expect(insert?.url.searchParams.get('sendUpdates')).toBe('none');
  });
  it('recovers an insert 409 by fetching and verifying the existing event', async () => {
    raceInsert = true;
    const result = await createGoogleProvider('test-memory-token').applyActions(plan, ['lunch']);
    expect(result[0]).toMatchObject({status:'already_exists', logged:true});
    expect(events).toHaveLength(1); expect(activity).toHaveLength(1);
  });
  it.each(['failed','lost-response'])('recovers %s Sheets append without duplicating Calendar or log', async failure => {
    failAppend = failure === 'failed'; lostAppendResponse = failure === 'lost-response';
    const provider = createGoogleProvider('test-memory-token');
    const first = await provider.applyActions(plan, ['lunch']);
    expect(first[0]).toMatchObject({status:'created',logged:false});
    const retry = await provider.applyActions(plan, ['lunch']);
    expect(retry[0]).toMatchObject({status:'already_exists',logged:true});
    expect(events).toHaveLength(1); expect(activity).toHaveLength(1);
  });
  it('recovers uncertain workbook creation after Calendar success on approved retry', async () => {
    lostWorkbookResponse = true;
    const first = await createGoogleProvider('test-memory-token').applyActions(plan,['lunch']);
    expect(first[0]).toMatchObject({status:'created',logged:false});
    const second = await createGoogleProvider('test-memory-token').applyActions(plan,['lunch']);
    expect(second[0]).toMatchObject({status:'already_exists',logged:true});
    expect(events).toHaveLength(1); expect(workbooks).toHaveLength(1);expect(activity).toHaveLength(1);
  });
  it('does not treat a cancelled or manually moved deterministic event as a completed action', async () => {
    const provider = createGoogleProvider('test-memory-token');
    await provider.applyActions(plan, ['lunch']);
    events[0].start.dateTime = '2026-09-14T13:00:00-07:00';
    expect((await provider.applyActions(plan, ['lunch']))[0].status).toBe('error');
  });
  it('serializes simultaneous approvals to prevent duplicate log rows', async () => {
    const provider = createGoogleProvider('test-memory-token');
    await Promise.all([provider.applyActions(plan,['lunch']),provider.applyActions(plan,['lunch'])]);
    expect(events).toHaveLength(1); expect(activity).toHaveLength(1);
  });
  it('stops writes when Calendar pagination is incomplete', async () => {
    calendarMore = true;
    const result = await createGoogleProvider('test-memory-token').applyActions(plan,['lunch']);
    expect(result[0]).toMatchObject({status:'error',logged:false});
    expect(result[0].message).toMatch(/more events/i);
    expect(calls.every(c => c.method === 'GET')).toBe(true);
    expect(calls.filter(c => c.url.pathname.endsWith('/events'))).toHaveLength(5);
  });
  it('derives distinct Calendar IDs and workbooks for different Google subjects', async () => {
    const first = await createGoogleProvider('test-memory-token').applyActions(plan,['lunch']);
    account = 'synthetic-account-b'; events = []; activity = [];
    const second = await createGoogleProvider('test-memory-token').applyActions(plan,['lunch']);
    expect(second[0].eventId).not.toBe(first[0].eventId);
    expect([...storage.values()].sort()).toEqual(['sheet-synthetic-account-a','sheet-synthetic-account-b']);
  });
  it('normalizes equivalent offsets across replans into the same Calendar ID', async () => {
    const provider = createGoogleProvider('test-memory-token');
    const first = await provider.applyActions(plan,['lunch']);
    const second = await provider.applyActions({...plan,actions:[{...plan.actions[0],start:'2026-09-14T19:00:00Z',end:'2026-09-14T19:30:00Z'}]},['lunch']);
    expect(second[0]).toMatchObject({status:'already_exists',eventId:first[0].eventId});
    expect(events).toHaveLength(1);
  });
  it('rejects malformed planning dates before any writes', async () => {
    const result = await createGoogleProvider('test-memory-token').applyActions({...plan,date:'not-a-date'},['lunch']);
    expect(result[0].status).toBe('error');
    expect(calls).toHaveLength(0);
  });
  it('fails closed on API permissions errors without pretending to succeed', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response({},403)));
    const result = await createGoogleProvider('test-memory-token').applyActions(plan,['lunch']);
    expect(result[0]).toMatchObject({status:'error',logged:false});
    expect(result[0].message).toMatch(/permission/i);
    expect(events).toHaveLength(0);
  });
});

describe('browser OAuth', () => {
  it('rejects denied and incomplete grants without connecting', async () => {
    vi.stubGlobal('google', {accounts:{oauth2:{initTokenClient: (options: any) => ({requestAccessToken: () => options.callback({error:'access_denied'})})}}});
    await expect(connectGoogle('client.apps.googleusercontent.com')).rejects.toThrow(/denied/i);
    vi.stubGlobal('google', {accounts:{oauth2:{initTokenClient: (options: any) => ({requestAccessToken: () => options.callback({access_token:'test-memory-token',scope:'openid'})})}}});
    await expect(connectGoogle('client.apps.googleusercontent.com')).rejects.toThrow(/permission|scope/i);
  });
  it('accepts complete scope grant and retains token only in memory', async () => {
    vi.stubGlobal('google', {accounts:{oauth2:{initTokenClient: (options: any) => ({requestAccessToken: () => options.callback({access_token:'test-memory-token',scope:GOOGLE_SCOPES.join(' '),expires_in:3600})})}}});
    const provider = await connectGoogle('client.apps.googleusercontent.com');
    expect(provider.mode).toBe('live');
    expect([...storage.values()]).not.toContain('test-memory-token');
  });
  it('surfaces popup closure and blockers as recoverable connect errors', async () => {
    vi.stubGlobal('google', {accounts:{oauth2:{initTokenClient: (options: any) => ({requestAccessToken: () => options.error_callback({type:'popup_closed'})})}}});
    await expect(connectGoogle('client.apps.googleusercontent.com')).rejects.toThrow(/closed/i);
  });
});

describe('food routine read and persistence boundaries', () => {
 it('round-trips explicit food goals in a range large enough for all preferences', async () => {
  const provider = createGoogleProvider('test-memory-token');
  await provider.savePreferences({ ...preferences, foodGoal: 'protein' });
  expect(await provider.readPreferences()).toMatchObject({ foodGoal: 'protein' });
  const put = calls.find(c => c.method === 'PUT' && decodeURIComponent(c.url.pathname).includes('Preferences'))!;
  const end = Number(decodeURIComponent(put.url.pathname).match(/B(\d+)$/)?.[1]);
  expect(end).toBeGreaterThanOrEqual(put.body?.values.length);
  await provider.savePreferences({ ...preferences, foodGoal: 'none' });
  expect(await provider.readPreferences()).toMatchObject({ foodGoal: 'none' });
  await provider.savePreferences(preferences);
  expect((await provider.readPreferences())?.foodGoal).toBeUndefined();
  savedPreferences = [['foodGoal', 'diagnose']];
  expect(await provider.readPreferences()).toEqual({});
 });
 it('matches brand identity through sender domains, not display-name or body mentions', async () => {
  const senders = ['Starbucks <offers@evil.test>', 'Receipt <orders@mail.starbucks.com>', 'Costco <orders@costco.com.evil.test>', 'Receipt <orders@costco.com>', 'Chipotle <orders@chipotle.com>'];
  messages = senders.map((from, i) => ({ id: String(i), internalDate: '1789300800000', payload: { headers: [{ name: 'Subject', value: 'Order receipt' }, { name: 'From', value: from }], body: { data: btoa('Your purchase at Starbucks Costco Chipotle') } } }));
  const result = await createGoogleProvider('test-memory-token').loadSources(plan.date, preferences);
  expect(result.receipts.map(r => r.merchantKey)).toEqual([undefined, 'starbucks', undefined, 'costco', 'chipotle']);
  const query = calls.find(c => c.url.pathname.endsWith('/messages'))?.url.searchParams.get('q');
  expect(query).toMatch(/costco/); expect(query).toMatch(/chipotle/);
 });
});

it('exposes only the verified cached account subject through token expiry', async () => {
 const provider = createGoogleProvider('test-memory-token');
 expect(provider.getAccountId?.()).toBeUndefined();
 await provider.readPreferences();
 expect(provider.getAccountId?.()).toBe('synthetic-account-a');
 expired = true;
 await expect(provider.loadSources(plan.date, preferences)).rejects.toThrow(/expired/i);
 expect(provider.getAccountId?.()).toBe('synthetic-account-a');
 provider.disconnect();
 expect(provider.getAccountId?.()).toBeUndefined();
});
