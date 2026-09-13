import { DateTime } from 'luxon';
import type { ActivityRow, AppConnection, AppName, ApplyResult, CalendarEvent, DayPlan, PlanAction, Preferences, Provider, Receipt, TraceEntry } from '../types';

// Primary calendar only; drive.file permits only workbooks created/opened by this app.
export const GOOGLE_SCOPES = ['openid', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/calendar.events.owned', 'https://www.googleapis.com/auth/drive.file'];
const CALENDAR = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';
const GMAIL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages';
type WireEvent = { id: string; summary?: string; status?: string; transparency?: string; location?: string; htmlLink?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string }; attendees?: { self?: boolean; responseStatus?: string }[]; extendedProperties?: { private?: Record<string, string> } };
type MimePart = { mimeType?: string; body?: { data?: string }; parts?: MimePart[]; headers?: { name: string; value: string }[] };
type Message = { id: string; internalDate?: string; payload?: MimePart; snippet?: string };
type TokenResponse = { access_token?: string; expires_in?: number; scope?: string; error?: string };
type GoogleIdentity = { accounts: { oauth2: { initTokenClient(options: {client_id: string; scope: string; include_granted_scopes: boolean; callback: (response: TokenResponse) => void; error_callback: (error: {type?: string}) => void}): { requestAccessToken(options?: {prompt?: string}): void } } } };
const getGoogle = () => (globalThis as typeof globalThis & {google?: GoogleIdentity}).google;
let gisLoading: Promise<void> | undefined;

export function loadGoogleIdentity(): Promise<void> {
  if (getGoogle()) return Promise.resolve();
  if (gisLoading) return gisLoading;
  gisLoading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.defer = true;
    const timer = setTimeout(() => { script.remove(); reject(new Error('Google sign-in did not load. Check your connection and retry.')); }, 15000);
    script.onload = () => { clearTimeout(timer); resolve(); };
    script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('Google sign-in could not load. Check your connection or browser blockers.')); };
    document.head.appendChild(script);
  }).catch(error => { gisLoading = undefined; throw error; });
  return gisLoading;
}

export async function connectGoogle(clientId: string): Promise<Provider> {
  if (!clientId.trim().endsWith('.apps.googleusercontent.com')) throw new Error('Enter a Google OAuth web client ID.');
  // Preload via loadGoogleIdentity on setup open when possible to preserve popup user activation.
  if (!getGoogle()) await loadGoogleIdentity();
  return new Promise<Provider>((resolve, reject) => {
    const google = getGoogle();
    if (!google) { reject(new Error('Google sign-in is unavailable. Reload and try again.')); return; }
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId.trim(), scope: GOOGLE_SCOPES.join(' '), include_granted_scopes: false,
      callback: response => {
        if (response.error || !response.access_token) { reject(new Error(`Google authorization denied (${response.error || 'no token'}). Connect again when ready.`)); return; }
        const granted = new Set(response.scope?.split(/\s+/));
        // Google can return the equivalent short email scope.
        if (granted.has('email')) granted.add('https://www.googleapis.com/auth/userinfo.email');
        if (!GOOGLE_SCOPES.every(scope => granted.has(scope))) { reject(new Error('Google permissions were incomplete. Grant the requested Gmail, Calendar, and Sheets permissions to connect.')); return; }
        resolve(createGoogleProvider(response.access_token, Date.now() + (Number(response.expires_in) || 3600) * 1000));
      },
      error_callback: error => reject(new Error(error.type === 'popup_closed' ? 'Google sign-in was closed. Connect again when ready.' : 'Google sign-in popup could not open. Allow popups and connect again.')),
    });
    client.requestAccessToken({prompt: 'select_account'});
  });
}

class GoogleError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
const isStatus = (error: unknown, status: number) => error instanceof GoogleError && error.status === status;
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Google request failed. Please retry.';
const storageRead = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const storageWrite = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* Memory remains usable if browser storage is disabled. */ } };
const storageRemove = (key: string) => { try {localStorage.removeItem(key);} catch { /* Browser storage may be disabled. */ } };
const instant = (value: string) => DateTime.fromISO(value, {setZone:true});
const safeUrl = (value?: string) => value?.startsWith('https://') ? value : undefined;

function calendarEvent(event: WireEvent, zone: string): CalendarEvent | null {
  if (event.status === 'cancelled' || event.transparency === 'transparent' || event.attendees?.some(a => a.self && a.responseStatus === 'declined')) return null;
  const start = event.start?.dateTime || (event.start?.date ? DateTime.fromISO(event.start.date, {zone}).startOf('day').toISO() : null);
  const end = event.end?.dateTime || (event.end?.date ? DateTime.fromISO(event.end.date, {zone}).startOf('day').toISO() : null);
  if (!start || !end || !instant(start).isValid || !instant(end).isValid) throw new Error('Google Calendar returned an event with an unreadable time. Planning stopped to avoid overlooking a conflict.');
  return {id:event.id, title:event.summary || 'Busy', start, end, allDay:!!event.start?.date, location:event.location, url:safeUrl(event.htmlLink), isDayweave:event.extendedProperties?.private?.dayweave === 'v1'};
}

function mimeText(part?: MimePart, depth = 0): string {
  if (!part || depth > 12) return '';
  let text = '';
  if (part.body?.data && (!part.mimeType || part.mimeType.startsWith('text/'))) {
    try {
      const decoded = atob(part.body.data.slice(0, 1_000_000).replace(/-/g, '+').replace(/_/g, '/'));
      text = new TextDecoder().decode(Uint8Array.from(decoded, char => char.charCodeAt(0)));
      if (part.mimeType === 'text/html') text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&');
    } catch { /* Unsupported/invalid body leaves the timestamp unknown. */ }
  }
  return [text, ...(part.parts || []).slice(0, 30).map(child => mimeText(child,depth + 1))].join('\n').slice(0, 100_000);
}

function receipt(message: Message, accountEmail?: string): Receipt | null {
  const headers = message.payload?.headers || [];
  const header = (name: string) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
  const text = mimeText(message.payload);
  const combined = `${header('Subject')}\n${text || message.snippet || ''}`;
  if (!/receipt|order|purchase|transaction/i.test(combined)) return null;
  const coffee = /coffee|café|cafe|latte|espresso|cappuccino|starbucks|blue bottle|peet'?s/i.test(combined);
  const meal = /lunch|dinner|breakfast|restaurant|doordash|ubereats|uber eats|grubhub|sandwich|salad/i.test(combined);
  const receivedMs = Number(message.internalDate);
  if (!message.internalDate || !Number.isFinite(receivedMs)) return null;
  const received = DateTime.fromMillis(receivedMs, {zone:'utc'});
  if (!received.isValid) return null;
  // Only explicit, timezone-bearing transaction timestamps qualify. Delivery is never consumption.
  const match = text.match(/(?:purchased\s+at|purchase(?:\s+(?:date|time))?|ordered\s+at|order\s+placed|transaction(?:\s+(?:date|time))?)\s*[:\-]?\s*(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2}))/i);
  const timestamp = match ? instant(match[1].replace(' ','T')) : null;
  const purchasedAt = timestamp?.isValid && timestamp.toMillis() <= received.toMillis() + 300000 ? timestamp.toISO() : null;
  // Match an actual sender mailbox domain, never a display name or body mention.
  // This is a source hint, not proof that an email or purchase is authentic.
  const from = header('From').trim();
  const mailbox = (from.match(/<([^<>]+)>$/)?.[1] ?? from).trim();
  const domain = mailbox.match(/^[^\s<>@]+@([a-z0-9.-]+)$/i)?.[1]?.toLowerCase();
  const merchantKey = (['starbucks', 'chipotle', 'costco'] as const).find(key => domain === `${key}.com` || domain?.endsWith(`.${key}.com`));
  const merchant = (header('From').replace(/<[^>]+>/g,'').replace(/"/g,'').trim() || 'Receipt sender').slice(0,120);
  return {id:message.id, merchant, merchantKey, category:coffee ? 'coffee' : meal ? 'meal' : 'other', purchasedAt, receivedAt:received.toISO()!, items:[], sourceUrl:accountEmail ? `https://mail.google.com/mail/?authuser=${encodeURIComponent(accountEmail)}#all/${encodeURIComponent(message.id)}` : undefined, timeSource:purchasedAt ? 'receipt' : 'email'};
}

const preferenceLimits: Record<string, [number, number]> = {sleepHours:[4,12], windDownMinutes:[0,180],sleepLatencyMinutes:[0,120],morningMinutes:[0,240],commuteMinutes:[0,240],lunchMinutes:[10,120]};
function cleanPreferences(input: Record<string, unknown>): Partial<Preferences> {
  const output: Record<string, unknown> = {};
  for (const [key, bounds] of Object.entries(preferenceLimits)) {
    const value = Number(input[key]);
    if (input[key] !== undefined && input[key] !== '' && Number.isFinite(value) && value >= bounds[0] && value <= bounds[1]) output[key] = value;
  }
  for (const key of ['defaultWakeTime','coffeeTime','lunchTime']) if (typeof input[key] === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input[key])) output[key] = input[key];
  if (typeof input.timeZone === 'string' && DateTime.now().setZone(input.timeZone).isValid) output.timeZone = input.timeZone;
  for (const key of ['name','dietaryPreferences']) if (typeof input[key] === 'string') output[key] = input[key].slice(0,1000);
  if (input.foodGoal === 'none' || input.foodGoal === 'protein') output.foodGoal = input.foodGoal;
  return output;
}

// Same-document serialization, plus Web Locks for other tabs on this origin when supported.
const writeQueues = new Map<string, Promise<unknown>>();
async function locked<T>(identity: string, operation: () => Promise<T>): Promise<T> {
  const previous = writeQueues.get(identity) || Promise.resolve();
  const next = previous.catch(() => undefined).then(() => typeof navigator !== 'undefined' && navigator.locks ? navigator.locks.request(`dayweave-google-${identity}`, operation) : operation());
  writeQueues.set(identity,next);
  try { return await next; } finally { if (writeQueues.get(identity) === next) writeQueues.delete(identity); }
}

export function createGoogleProvider(initialToken: string, expiresAt = Number.POSITIVE_INFINITY): Provider {
  let token = initialToken;
  let identityPromise: Promise<string> | undefined;
  let spreadsheetId: string | undefined;
  let accountEmail: string | undefined;
  const connections: AppConnection[] = (['gmail','calendar','sheets'] as AppName[]).map(app => ({app,connected:!!token,detail:app === 'calendar' ? 'Primary calendar' : app === 'sheets' ? 'Dayweave workbook only' : 'Receipt emails, last 30 days'}));
  function assertConnected() {
    if (!token || Date.now() >= expiresAt) { token = ''; connections.forEach(c => {c.connected = false; c.detail = 'Reconnect Google';}); throw new GoogleError('Google connection expired or disconnected. Reconnect Google to continue.',401); }
  }
  async function request<T>(url: string, app?: AppName, method = 'GET', body?: unknown): Promise<T> {
    assertConnected();
    let response: Response;
    try { response = await fetch(url, {method,headers:{Authorization:`Bearer ${token}`,...(body ? {'Content-Type':'application/json'} : {})},body:body ? JSON.stringify(body) : undefined,signal:AbortSignal.timeout(20000)}); }
    catch { throw new GoogleError('Google request could not complete. Check your connection and retry; approved actions are safe to retry.',0); }
    if (!response.ok) {
      if (response.status === 401) { token = ''; connections.forEach(c => {c.connected = false;c.detail = 'Reconnect Google';}); }
      if (response.status === 403 && app) { const connection = connections.find(c => c.app === app)!;connection.connected = false;connection.detail = 'Permission or API setup required'; }
      const detail = response.status === 401 ? 'Google connection expired. Reconnect Google.' : response.status === 403 ? `Google ${app || 'account'} permission denied. Check API setup and reconnect with the requested permissions.` : response.status === 429 ? 'Google rate limit reached. Wait briefly before retrying.' : `Google ${app || 'account'} request failed (${response.status}). Retry when ready.`;
      throw new GoogleError(detail,response.status);
    }
    if (app) connections.find(c => c.app === app)!.connected = true;
    return response.status === 204 ? {} as T : response.json() as Promise<T>;
  }
  function identity(): Promise<string> {
    assertConnected();
    if (!identityPromise) identityPromise = request<{sub?:string;email?:string}>('https://openidconnect.googleapis.com/v1/userinfo').then(result => { if (!result.sub) throw new Error('Could not verify Google account identity. Reconnect Google.');accountEmail=result.email;return result.sub; }).catch(error => {identityPromise = undefined;throw error;});
    return identityPromise;
  }
  const sheetKey = (subject: string) => `dayweave:google:${subject}:spreadsheet`;
  async function forgetWorkbook() {const subject = await identity();spreadsheetId = undefined;storageRemove(sheetKey(subject));}
  async function workbook(create = false): Promise<string | undefined> {
    const subject = await identity();
    spreadsheetId ||= storageRead(sheetKey(subject)) || undefined;
    if (!spreadsheetId && create) {
      const pendingKey = `${sheetKey(subject)}:pending`;
      const pending = storageRead(pendingKey);
      if (pending) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(pending)) throw new Error('The saved workbook recovery marker is invalid. Review browser storage before retrying.');
        const query = new URLSearchParams({q:`name = 'Dayweave (${pending})' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,fields:'files(id,name),nextPageToken',pageSize:'100',spaces:'drive'});
        const found = await request<{files?:{id:string}[];nextPageToken?:string}>(`https://www.googleapis.com/drive/v3/files?${query}`,'sheets');
        if (found.nextPageToken || found.files?.length !== 1) throw new Error('The previous workbook creation is still unconfirmed. Wait briefly and retry so Dayweave can find it; no second workbook will be created.');
        spreadsheetId = found.files[0].id;
      } else {
        const attempt = crypto.randomUUID();
        storageWrite(pendingKey,attempt);
        if (storageRead(pendingKey) !== attempt) throw new Error('Enable browser storage before creating the Dayweave workbook so interrupted saves can recover safely.');
        let created: {spreadsheetId:string};
        try {created = await request<{spreadsheetId:string}>(SHEETS,'sheets','POST',{properties:{title:`Dayweave (${attempt})`},sheets:[{properties:{title:'Preferences'}},{properties:{title:'Activity'}}]});}
        catch(error) {
          // These responses definitively reject creation; network/5xx outcomes remain pending.
          if ([400,401,403,404,429].some(status => isStatus(error,status))) storageRemove(pendingKey);
          throw error;
        }
        if (!created.spreadsheetId) throw new Error('Google Sheets did not confirm the workbook ID. Retry to recover the pending workbook.');
        spreadsheetId = created.spreadsheetId;
      }
      storageWrite(sheetKey(subject),spreadsheetId);
      if (storageRead(sheetKey(subject)) === spreadsheetId) storageRemove(pendingKey);
    }
    return spreadsheetId;
  }
  const valuesUrl = (id:string,range:string) => `${SHEETS}/${encodeURIComponent(id)}/values/${encodeURIComponent(range)}`;
  async function getActivity(): Promise<ActivityRow[]> {
    const id = await workbook(); if (!id) return [];
    let result: {values?:string[][]};
    try {result = await request<{values?:string[][]}>(valuesUrl(id,'Activity!A:H'),'sheets');}
    catch(error) {if (!isStatus(error,404)) throw error;await forgetWorkbook();return [];}
    return (result.values || []).filter(row => row[0] && row[0] !== 'actionId').map(row => ({actionId:row[0],date:row[1] || '',title:row[2] || '',start:row[3] || '',end:row[4] || '',status:row[5] || '',eventId:row[6] || '',eventUrl:safeUrl(row[7]) || ''}));
  }
  async function listEvents(start:string,end:string,zone:string): Promise<CalendarEvent[]> {
    const output: CalendarEvent[] = []; let pageToken: string | undefined;
    for (let page = 0; page < 5; page++) {
      const query = new URLSearchParams({timeMin:start,timeMax:end,singleEvents:'true',showDeleted:'false',maxResults:'250',orderBy:'startTime',timeZone:zone,...(pageToken ? {pageToken}: {})});
      const result = await request<{items?:WireEvent[];nextPageToken?:string;timeZone?:string}>(`${CALENDAR}?${query}`,'calendar');
      for (const event of result.items || []) { const normalized = calendarEvent(event,result.timeZone || zone);if (normalized) output.push(normalized); }
      pageToken = result.nextPageToken;if (!pageToken) return output;
    }
    throw new Error('Calendar contains more events than Dayweave can safely check. No changes were made; narrow your calendar before retrying.');
  }
  async function readReceipts(): Promise<Receipt[]> {
    await identity();
    const ids: string[] = [];let pageToken: string | undefined;
    for (let page = 0; page < 3 && ids.length < 30; page++) {
      const query = new URLSearchParams({q:'newer_than:30d {receipt "order confirmation" "order placed"} {coffee cafe latte espresso starbucks restaurant lunch chipotle costco doordash "uber eats" grubhub meal}',maxResults:String(30 - ids.length),...(pageToken ? {pageToken}: {})});
      const result = await request<{messages?:{id:string}[];nextPageToken?:string}>(`${GMAIL}?${query}`,'gmail');
      ids.push(...(result.messages || []).map(message => message.id).filter(id => !ids.includes(id)).slice(0,30-ids.length));
      pageToken = result.nextPageToken;if (!pageToken) break;
    }
    const receipts: Receipt[] = [];
    for (let offset = 0; offset < ids.length; offset += 5) {
      const batch = await Promise.all(ids.slice(offset,offset+5).map(async id => {
        try { return receipt(await request<Message>(`${GMAIL}/${encodeURIComponent(id)}?format=full`,'gmail'),accountEmail); }
        catch(error) { if (isStatus(error,404)) return null;throw error; }
      }));
      receipts.push(...batch.filter((item): item is Receipt => item !== null));
    }
    return receipts;
  }
  function trace(callback: ((entry:TraceEntry) => void) | undefined, tool:string, app:AppName, status:TraceEntry['status'], message:string) {
    callback?.({id:crypto.randomUUID(),tool,app,status,message,at:new Date().toISOString()});
  }
  async function eventId(action:PlanAction,date:string): Promise<string> {
    const canonical = JSON.stringify([await identity(),'primary',date,action.kind,instant(action.start).toUTC().toISO(),instant(action.end).toUTC().toISO()]);
    const hash = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical));
    return `d${Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2,'0')).join('')}`;
  }
  async function findEvent(id:string): Promise<WireEvent | null> {
    try { return await request<WireEvent>(`${CALENDAR}/${id}`,'calendar'); } catch(error) { if (isStatus(error,404)) return null;throw error; }
  }
  function verifyExisting(existing: WireEvent, action:PlanAction,id:string) {
    if (existing.status === 'cancelled' || existing.extendedProperties?.private?.dayweaveAction !== id || !existing.start?.dateTime || !existing.end?.dateTime || instant(existing.start.dateTime).toMillis() !== instant(action.start).toMillis() || instant(existing.end.dateTime).toMillis() !== instant(action.end).toMillis()) throw new Error('A previous Dayweave event was changed or removed. Review it in Calendar before choosing a new time.');
  }
  async function applyOne(plan: DayPlan, action:PlanAction, onTrace?: (entry:TraceEntry) => void): Promise<ApplyResult> {
    const id = await eventId(action,plan.date);
    let existing = await findEvent(id); let status: ApplyResult['status'] = existing ? 'already_exists' : 'created';
    if (existing) verifyExisting(existing,action,id);
    else {
      trace(onTrace,'calendar.recheck','calendar','running','Checking the latest primary-calendar conflicts.');
      const fresh = await listEvents(action.start,action.end,plan.timeZone);
      if (fresh.some(event => instant(event.start).toMillis() < instant(action.end).toMillis() && instant(event.end).toMillis() > instant(action.start).toMillis())) {
        trace(onTrace,'calendar.recheck','calendar','error','The selected time now overlaps a busy event.');
        return {actionId:action.id,status:'conflict',message:'Your calendar changed: this time is now busy. Refresh the plan before approving.',logged:false};
      }
      try { existing = await request<WireEvent>(`${CALENDAR}?sendUpdates=none`,'calendar','POST',{id,summary:action.title.slice(0,300),description:`Dayweave · approved by you\n${action.description.slice(0,2000)}`,start:{dateTime:action.start,timeZone:plan.timeZone},end:{dateTime:action.end,timeZone:plan.timeZone},extendedProperties:{private:{dayweave:'v1',dayweaveAction:id}},reminders:{useDefault:false}}); }
      catch(error) {
        if (!isStatus(error,409)) throw error;
        existing = await findEvent(id);if (!existing) throw error;verifyExisting(existing,action,id);status = 'already_exists';
      }
    }
    const result: ApplyResult = {actionId:action.id,status,eventId:id,eventUrl:safeUrl(existing?.htmlLink),logged:false,message:status === 'created' ? 'Added to your primary calendar.' : 'Already present in your primary calendar.'};
    trace(onTrace,'calendar.apply','calendar','success',result.message);
    try {
      const rows = await getActivity();
      const sheet = await workbook(true);
      if (!rows.some(row => row.eventId === id)) await request(`${valuesUrl(sheet!,'Activity!A:H')}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,'sheets','POST',{values:[[action.id,plan.date,action.title,action.start,action.end,status,id,result.eventUrl || '']]});
      result.logged = true;result.message += ' Saved to the Sheets activity log.';
      trace(onTrace,'sheets.log','sheets','success','Approved action recorded in Dayweave activity.');
    } catch(error) {
      result.message += ` Sheets logging is incomplete: ${messageOf(error)} Retry this same action to reconcile the log without duplicating the event.`;
      trace(onTrace,'sheets.log','sheets','error','Calendar action exists; Sheets logging needs a retry.');
    }
    return result;
  }
  return {
    mode:'live',
    getConnections: () => { if (Date.now() >= expiresAt) {token='';connections.forEach(c => {c.connected=false;c.detail='Reconnect Google';});}return connections.map(connection => ({...connection})); },
    async loadSources(date,preferences,onTrace) {
      const day = DateTime.fromISO(date,{zone:preferences.timeZone}).startOf('day');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !day.isValid) throw new Error('Choose a valid planning date and timezone.');
      const read = async <T>(app: AppName, tool:string, fn: () => Promise<T>) => {
        trace(onTrace,tool,app,'running',`Reading ${app === 'gmail' ? 'recent receipt emails' : 'primary calendar'}.`);
        try {const result = await fn();trace(onTrace,tool,app,'success',`Read ${app} successfully.`);return result;}
        catch(error) {trace(onTrace,tool,app,'error',messageOf(error));throw error;}
      };
      const [events,receipts] = await Promise.all([read('calendar','calendar.read',() => listEvents(day.minus({days:1}).toISO()!,day.plus({days:2}).toISO()!,preferences.timeZone)),read('gmail','gmail.receipts',readReceipts)]);
      return {events,receipts,warnings:['Calendar checks cover your primary calendar only.',...(receipts.some(item => !item.purchasedAt) ? ['Some receipts have no verifiable purchase time. Email arrival is not a consumption time.'] : [])]};
    },
    async readPreferences() {
      const id = await workbook();if (!id) return null;
      let data: {values?:unknown[][]};
      try {data = await request<{values?:unknown[][]}>(valuesUrl(id,'Preferences!A:B'),'sheets');}
      catch(error) {if (!isStatus(error,404)) throw error;await forgetWorkbook();return null;}
      return cleanPreferences(Object.fromEntries((data.values || []).filter(row => typeof row[0] === 'string').map(row => [row[0],row[1]])));
    },
    async savePreferences(preferences) {
      const cleaned = cleanPreferences(preferences as unknown as Record<string,unknown>);
      if (Object.keys(cleaned).length !== (preferences.foodGoal === undefined ? 12 : 13)) throw new Error('Review preference values before saving.');
      await locked(await identity(),async () => {
        const id = await workbook(true);
        await request(`${valuesUrl(id!,'Preferences!A1:B13')}?valueInputOption=RAW`,'sheets','PUT',{values:[...Object.entries(cleaned), ...(cleaned.foodGoal === undefined ? [['', '']] : [])]});
      });
    },
    async applyActions(plan,actionIds,onTrace) {
      if (!actionIds.length) return [];
      const ids = [...new Set(actionIds)];
      const actions = ids.map(id => plan.actions.find(action => action.id === id));
      if (plan.mode !== 'live' || !/^\d{4}-\d{2}-\d{2}$/.test(plan.date) || !DateTime.fromISO(plan.date,{zone:plan.timeZone}).isValid || actions.some(action => !action) || actions.some(action => {const start = instant(action!.start),end = instant(action!.end);return !start.isValid || !end.isValid || !/(?:Z|[+-]\d{2}:\d{2})$/.test(action!.start) || !/(?:Z|[+-]\d{2}:\d{2})$/.test(action!.end) || end <= start || end.diff(start,'hours').hours > 24;})) return ids.map(actionId => ({actionId,status:'error' as const,message:'Approval contains an unknown action, invalid time, or non-live plan. Refresh and review the plan.'}));
      try { return await locked(await identity(),async () => {
        const results: ApplyResult[] = [];
        for (const action of actions) {
          try {results.push(await applyOne(plan,action!,onTrace));}
          catch(error) {trace(onTrace,'calendar.apply','calendar','error',messageOf(error));results.push({actionId:action!.id,status:'error',message:messageOf(error),logged:false});}
        }
        return results;
      }); } catch(error) {return ids.map(actionId => ({actionId,status:'error' as const,message:messageOf(error),logged:false}));}
    },
    getActivity,
    getSpreadsheetUrl: () => spreadsheetId ? `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/edit` : undefined,
    disconnect() {token = '';spreadsheetId = undefined;identityPromise = undefined;accountEmail = undefined;connections.forEach(c => {c.connected=false;c.detail='Disconnected';});},
  };
}
