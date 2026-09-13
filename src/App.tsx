import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronRight, CircleHelp, Coffee, Flower2, Heart, LayoutDashboard, LoaderCircle, LogOut, Mail, Moon, RefreshCw, Settings2, Sheet, ShieldCheck, Sparkles, Unplug, X } from 'lucide-react';
import type { ActivityRow, ApplyResult, DayPlan, Preferences, Provider, TraceEntry } from './types';
import { DEFAULT_PREFERENCES, tomorrowDate } from './lib/defaults';
import { createDemoProvider } from './lib/demo';
import { generatePlan } from './lib/agent';
import { connectGoogle, loadGoogleIdentity } from './lib/google';
import { ApprovalDialog } from './components/ApprovalDialog';
import { Modal } from './components/Modal';
import { MealIdeasView } from './components/MealIdeasView';
import { MonthlyFoodEstimate } from './components/MonthlyFoodEstimate';
import { PreferencesPanel } from './components/PreferencesPanel';
import { PlanCardView } from './components/PlanCardView';
import { dateLabel, fullTime, safeUrl, time } from './components/format';

const appNames = { gmail: 'Gmail', calendar: 'Google Calendar', sheets: 'Google Sheets' };
const appIcons = { gmail: Mail, calendar: CalendarDays, sheets: Sheet };
type Panel = 'settings' | 'connect' | 'activity' | 'about' | null;
export default function App() {
 const [provider, setProvider] = useState<Provider>(() => createDemoProvider('busy'));
 const [scenario, setScenario] = useState<'busy' | 'early' | 'sparse'>('busy');
 const [preferences, setPreferences] = useState<Preferences>({ ...DEFAULT_PREFERENCES });
 const [date, setDate] = useState(() => tomorrowDate(DEFAULT_PREFERENCES.timeZone));
 const [plan, setPlan] = useState<DayPlan | null>(null);
 const [selected, setSelected] = useState<string[]>([]);
 const [trace, setTrace] = useState<TraceEntry[]>([]);
 const [activity, setActivity] = useState<ActivityRow[]>([]);
 const [results, setResults] = useState<ApplyResult[]>([]);
 const [busy, setBusy] = useState(false); const [applying, setApplying] = useState(false);
 const [error, setError] = useState(''); const [notice, setNotice] = useState('');
 const [panel, setPanel] = useState<Panel>(null); const [review, setReview] = useState(false);
 const [clientId, setClientId] = useState(import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '');
 const [apiKey, setApiKey] = useState(''); const [consent, setConsent] = useState(false);
 const operation = useRef(0); const started = useRef(false);
 const addTrace = (entry: TraceEntry) => setTrace(old => [...old.filter(item => item.id !== entry.id), entry]);
 function errorText(value: unknown) { return value instanceof Error ? value.message : 'Something went wrong. Please try again.'; }
 async function build(nextProvider = provider, nextDate = date, nextPreferences = preferences, allowAI = true) {
  const id = ++operation.current; setBusy(true); setError(''); setNotice(''); setPlan(null); setResults([]); setSelected([]); setTrace([]);
  try {
   const next = await generatePlan({ provider: nextProvider, date: nextDate, preferences: nextPreferences, apiKey: allowAI && consent && apiKey.trim() ? apiKey.trim() : undefined, onTrace: entry => { if (operation.current === id) addTrace(entry); } });
   if (operation.current !== id) return;
   setPlan(next); setTrace(next.trace); setSelected(next.actions.filter(action => action.selected).map(action => action.id));
   try { const rows = await nextProvider.getActivity(); if (operation.current === id) setActivity(rows); } catch (e) { if (operation.current === id) setNotice(`Plan ready, but activity history could not load: ${errorText(e)}`); }
  } catch (e) { if (operation.current === id) setError(errorText(e)); }
  finally { if (operation.current === id) setBusy(false); }
 }
 useEffect(() => { if (!started.current) { started.current = true; void build(); } }, []);
 useEffect(() => { if (panel === 'connect' && provider.mode === 'demo') void loadGoogleIdentity().catch(() => setNotice('Google sign-in could not preload. Check your connection and retry Connect Google.')); }, [panel, provider]);
 async function connect() {
  setBusy(true); setError(''); setNotice('');
  const previousAccount = provider.getAccountId?.();
  let connected: Provider | undefined;
  try {
   connected = await connectGoogle(clientId.trim());
   let nextPreferences = { ...DEFAULT_PREFERENCES }; let preferenceWarning = '';
   try { const saved = await connected.readPreferences(); if (saved) nextPreferences = { ...DEFAULT_PREFERENCES, ...saved }; } catch (e) { preferenceWarning = `Google connected. Saved preferences could not load: ${errorText(e)}`; }
   const nextAccount = connected.getAccountId?.();
   if (connected.getAccountId && !nextAccount) throw new Error('Could not verify the Google account. Your current plan is unchanged; reconnect again.');
   const sameAccount = provider.mode === 'live' && !!previousAccount && previousAccount === nextAccount;
   provider.disconnect(); setProvider(connected); setConsent(false); setReview(false); setPanel(null);
   if (sameAccount) {
    setNotice('Reconnected to the same Google account. Review any unfinished actions again before retrying.');
    return;
   }
   if (provider.mode === 'live') setApiKey('');
   setPlan(null); setActivity([]); setSelected([]); setResults([]); setPreferences(nextPreferences);
   const nextDate = provider.mode === 'live' || nextPreferences.timeZone !== preferences.timeZone ? tomorrowDate(nextPreferences.timeZone) : date;
   setDate(nextDate); await build(connected, nextDate, nextPreferences, false); if (preferenceWarning) setNotice(preferenceWarning);
  } catch (e) { connected?.disconnect(); setError(errorText(e)); }
  finally { setBusy(false); }
 }
 function useDemo(nextScenario = scenario) {
  provider.disconnect(); const nextPreferences = { ...DEFAULT_PREFERENCES }; const nextDate = tomorrowDate(nextPreferences.timeZone); setPreferences(nextPreferences); setDate(nextDate); const next = createDemoProvider(nextScenario); setProvider(next); setScenario(nextScenario); setActivity([]); setApiKey(''); setConsent(false); setPanel(null); void build(next, nextDate, nextPreferences, false);
 }
 async function apply() {
  if (!plan || applying || !selected.length) return;
  setApplying(true); setError('');
  try { const applied = await provider.applyActions(plan, selected, addTrace); setResults(applied); setPlan(current => {
   if (!current) return current;
   const events = [...current.events];
   for (const result of applied) {
    const action = current.actions.find(item => item.id === result.actionId);
    if (action && result.eventId && ['created', 'already_exists'].includes(result.status) && !events.some(event => event.id === result.eventId)) events.push({ id: result.eventId, title: action.title, start: action.start, end: action.end, url: result.eventUrl, isDayweave: true });
   }
   return { ...current, events };
  }); setReview(false); setSelected(old => old.filter(id => !applied.some(result => result.actionId === id && ['created', 'already_exists'].includes(result.status) && result.logged !== false))); try { setActivity(await provider.getActivity()); } catch (e) { setNotice(`Changes finished, but activity history could not refresh: ${errorText(e)}`); } }
  catch (e) { setError(errorText(e)); setReview(false); }
  finally { setApplying(false); }
 }
 const connections = provider.getConnections();
 const totalBusy = busy || applying;
 return <div className="app-shell">
  <a className="skip-link" href="#main">Skip to your plan</a>
  <aside className="sidebar">
   <a className="brand" href="#main" aria-label="Dayweave home"><span className="brand-mark"><Flower2 size={25}/></span>dayweave<span className="brand-period">.</span></a>
   <div className="sidebar-label">A LITTLE AHEAD, A LOT LIGHTER</div>
   <nav aria-label="Main navigation"><button className="nav-item active" onClick={() => setPanel(null)}><LayoutDashboard size={18}/>Your tomorrow<span className="nav-dot"/></button><button className="nav-item" onClick={() => setPanel('activity')}><RefreshCw size={18}/>Activity<span className="nav-count">{activity.length}</span></button><button className="nav-item" onClick={() => setPanel('settings')} disabled={totalBusy}><Settings2 size={18}/>Your routines</button></nav>
   <div className="sidebar-connections"><div className="eyebrow">YOUR CONNECTED WORLD</div>{connections.map(connection => { const Icon = appIcons[connection.app]; return <div className="connection-row" key={connection.app}><Icon size={18} strokeWidth={1.6}/><span>{appNames[connection.app]}<small>{provider.mode === 'demo' ? 'Synthetic demo data' : connection.connected ? 'Connected' : connection.detail}</small></span><span className={`connection-dot ${connection.connected ? 'connected' : ''}`} title={connection.detail}/></div>; })}<button className="text-button" disabled={totalBusy} onClick={() => setPanel('connect')}>{provider.mode === 'demo' ? 'Connect your apps' : 'Manage connection'}<ArrowRight size={14}/></button></div>
   <div className="sidebar-bottom"><div className="quiet-note"><span>Less figuring it out.<br/>More living your day.</span><Flower2 size={34} strokeWidth={1}/></div><button className="profile" onClick={() => setPanel('settings')} disabled={totalBusy}><span className="avatar">{preferences.name?.trim().charAt(0).toUpperCase() || 'Y'}</span><span>{preferences.name || 'Your space'}<small>A rhythm of your own</small></span><Settings2 size={16}/></button><div className="sidebar-footer"><a href={`${import.meta.env.BASE_URL}privacy.html`} target="_blank" rel="noreferrer">Privacy</a><button onClick={() => setPanel('about')}>How it works</button><a href={`${import.meta.env.BASE_URL}demo.html`} target="_blank" rel="noreferrer">Watch demo</a></div></div>
  </aside>
  <div className="workspace">
   <header className="topbar"><span className="breadcrumb">Your space <ChevronRight size={13}/><strong>Tomorrow, thoughtfully</strong></span><div className="mode-controls"><span className={`mode-badge ${provider.mode}`}><span/>{provider.mode === 'demo' ? 'Demo workspace' : 'Live Google account'}</span><button className="button small secondary" onClick={() => setPanel('connect')} disabled={totalBusy}>{provider.mode === 'demo' ? 'Make it yours' : 'Connection'}<ArrowUpRight size={13}/></button></div></header>
   <main id="main">
    <div className="page-heading"><div><div className="eyebrow"><span className="sun-dot"/> A LITTLE CARE FOR WHAT’S NEXT</div><h1>Tomorrow, with room for <em>you.</em></h1><p>Your calendar, your routines, a little breathing room. Woven together.</p></div><div className="date-picker"><CalendarDays size={17}/><input aria-label="Plan date" type="date" value={date} disabled={totalBusy} onChange={e => { if (e.target.value) { setDate(e.target.value); void build(provider, e.target.value); } }}/></div></div>
    <div className="day-toolbar"><div className="day-title">{dateLabel(date, { weekday: 'long' })}<span>{dateLabel(date, { month: 'long', day: 'numeric' })}</span></div><div className="toolbar-controls">{provider.mode === 'demo' && <label className="scenario-label">Try a day<select aria-label="Demo scenario" value={scenario} disabled={totalBusy} onChange={e => useDemo(e.target.value as typeof scenario)}><option value="busy">A full day</option><option value="early">An early start</option><option value="sparse">A fresh start</option></select></label>}<button className="icon-button" title="Refresh plan" aria-label="Refresh plan" disabled={totalBusy} onClick={() => void build()}><RefreshCw size={17} className={busy ? 'spinning' : ''}/></button></div></div>
    {provider.mode === 'demo' && <div className="demo-note"><Sparkles size={15}/><span>A working preview with synthetic data. Explore a day, then connect your own apps.</span></div>}
    {error && <div className="alert error" role="alert"><CircleHelp size={19}/><div><strong>We couldn’t finish that step.</strong><p>{error}</p><button className="text-button" disabled={totalBusy} onClick={() => void build()}>Retry reading and planning <ArrowRight size={14}/></button></div><button className="icon-button" aria-label="Dismiss error" onClick={() => setError('')}><X size={16}/></button></div>}
    {notice && <div className="notice" role="status">{notice}</div>}
    {results.length > 0 && <div className="results" role="status">{results.map(result => <div key={result.actionId} className={result.status === 'conflict' || result.status === 'error' || result.logged === false ? 'result-problem' : 'result-success'}><Check size={16}/><div><strong>{plan?.actions.find(action => action.id === result.actionId)?.title ?? result.actionId}</strong><p>{result.message}{result.logged === false ? ' The activity log is incomplete; select this action again to retry logging.' : ''}</p>{safeUrl(result.eventUrl) && <a href={safeUrl(result.eventUrl)} target="_blank" rel="noreferrer">Open event ↗</a>}</div></div>)}</div>}
    <div className="dashboard-grid"><section className="plan-column" aria-label="Your suggested plan">
     <div className="plan-intro"><div className="intro-spark"><Sparkles size={20}/></div><div><h2>{busy ? 'Finding your rhythm…' : plan?.headline || 'A thoughtful day starts here.'}</h2><p>{busy ? 'Looking at commitments and routines, then making space around them.' : plan?.summary || 'Connect your sources or refresh the plan to begin.'}</p></div></div>
     {busy && !plan ? <div className="skeletons" aria-label="Preparing your plan" aria-busy="true">{[1, 2, 3].map(n => <div className="skeleton-card" key={n}><span/><span/><span/></div>)}</div> : plan?.cards.map(card => <PlanCardView key={card.id} card={card} plan={plan} selected={!!card.actionId && selected.includes(card.actionId)} disabled={totalBusy} onSelect={() => { if (card.actionId) setSelected(old => old.includes(card.actionId!) ? old.filter(id => id !== card.actionId) : [...old, card.actionId!]); }}/>) }
     {plan?.mealIdeas && <MealIdeasView ideas={plan.mealIdeas} plan={plan} onEdit={() => setPanel('settings')} disabled={totalBusy}/>}
     {plan && <MonthlyFoodEstimate key={plan.id}/>}
     {plan?.warnings.map((warning, index) => <p className="plan-warning" key={index}><CircleHelp size={15}/>{warning}</p>)}
     {plan && <div className="approval-bar"><div><span className="approval-count">{selected.length}</span><span><strong>{selected.length ? 'Small changes. A calmer day.' : 'Choose what works for you.'}</strong><small>{selected.length} {selected.length === 1 ? 'suggestion' : 'suggestions'} selected · review before adding</small></span></div><button className="button primary" disabled={!selected.length || totalBusy} onClick={() => setReview(true)}>Review & add<ArrowRight size={16}/></button></div>}
     <div className="care-note"><ShieldCheck size={15}/><span>You’re in charge. Dayweave only adds events after you review and confirm.</span></div>
    </section>
    <aside className="day-aside" aria-label="Schedule and evidence"><section className="schedule-panel"><div className="section-heading"><h2>A glance at your day</h2><CalendarDays size={17}/></div><p className="tiny">{preferences.timeZone.replaceAll('_', ' ')}</p><div className="timeline">{plan?.events.length ? [...plan.events].sort((a, b) => a.start.localeCompare(b.start)).map(event => <div className={`timeline-event ${event.isDayweave ? 'dayweave-event' : ''}`} key={event.id}><span className="timeline-point"/><time>{event.allDay ? 'ALL DAY' : fullTime(event.start, plan.timeZone)}</time><strong>{event.title}</strong><small>{event.allDay ? 'All-day commitment' : `${time(event.start, plan.timeZone)} – ${time(event.end, plan.timeZone)}`}</small></div>) : <div className="empty-schedule"><CalendarDays size={25}/><p>{busy ? 'Reading your day…' : 'Some lovely open space.'}</p><small>{busy ? 'Your commitments will appear here.' : 'No calendar commitments found for this date.'}</small></div>}</div><div className="schedule-footer"><span className="source-dot calendar"/>{provider.mode === 'demo' ? 'Demo Calendar' : 'Google Calendar'}<span>{plan?.events.length ?? 0} events</span></div></section>
     <section className="agent-panel"><div className="section-heading"><h2>Behind the weave</h2><Sparkles size={17}/></div><span className={`intelligence-badge ${plan?.aiUsed ? 'ai-active' : ''}`}>{plan?.aiUsed ? 'Gemini AI used' : busy ? 'Preparing your plan' : 'Deterministic planning'}</span><p>{plan?.aiUsed ? 'AI helped connect the dots. Validated scheduling rules set the times.' : 'Your plan uses scheduling rules and source evidence. No AI request is claimed.'}</p><details className="trace-details"><summary>View agent activity<span>{trace.length} steps</span></summary><div className="trace-list" aria-live="polite">{trace.length ? trace.map(entry => <div key={entry.id} className={`trace-entry ${entry.status}`}><span>{entry.status === 'running' ? <LoaderCircle size={13} className="spinning"/> : entry.status === 'success' ? <Check size={13}/> : <span>·</span>}</span><div><strong>{entry.tool.replaceAll('_', ' ')}</strong><p>{entry.message}</p></div></div>) : <p className="tiny">Activity appears as your plan is prepared.</p>}</div></details></section>
     <div className="aside-quote"><Flower2 size={28} strokeWidth={1}/><p>Good days don’t happen<br/>all at once.</p><span>Start with a little space.</span></div>
    </aside></div>
    <footer className="main-footer"><span>Made for real life, with a little more room.</span><span>Dayweave <Heart size={11}/></span></footer>
   </main>
  </div>
  {review && plan && <ApprovalDialog plan={plan} actionIds={selected} busy={applying} onCancel={() => setReview(false)} onConfirm={() => void apply()}/>}
  {panel === 'settings' && <PreferencesPanel preferences={preferences} mode={provider.mode} busy={totalBusy} onClose={() => setPanel(null)} onUse={value => { const nextDate = value.timeZone === preferences.timeZone ? date : tomorrowDate(value.timeZone); setDate(nextDate); setPreferences(value); setPanel(null); void build(provider, nextDate, value); }} onSave={async value => { setBusy(true); try { await provider.savePreferences(value); } finally { setBusy(false); } }}/>}
  {panel === 'connect' && <Modal title="Bring your day together." onClose={() => setPanel(null)} busy={totalBusy}>
   <p className="muted">Connect Gmail, Calendar and Sheets to make a plan from your own day. Google access and the optional AI key stay in this browser’s memory.</p>
   {provider.mode === 'live' ? <div className="connected-notice"><ShieldCheck size={20}/><div><strong>Your Google account is connected</strong><p>Each app’s current status is shown in the sidebar.</p><button className="text-button" disabled={totalBusy} onClick={() => void connect()}>Reconnect Google</button><button className="text-button" disabled={totalBusy} onClick={() => useDemo()}><LogOut size={14}/>Disconnect & return to demo</button></div></div> : <><label className="field">Google OAuth client ID<input value={clientId} onChange={e => setClientId(e.target.value)} autoComplete="off" placeholder="…apps.googleusercontent.com"/></label><p className="tiny">A public Web application client ID from your Google Cloud project. Enable Gmail, Calendar, Sheets and Drive APIs and allow this site’s origin. <a href={`${import.meta.env.BASE_URL}setup.html`} target="_blank" rel="noreferrer">Setup guide ↗</a></p><button className="button google-button" disabled={totalBusy || !clientId.trim()} onClick={() => void connect()}>{busy ? <LoaderCircle className="spinning" size={18}/> : <span className="google-g">G</span>}Connect Google</button></>}
   <div className="setup-divider"/><div className="section-heading"><h3>A little help from Gemini</h3><span className="optional">Optional</span></div><p className="tiny">Without an AI key, the app still creates an evidence-based plan using scheduling rules.</p><label className="field">Gemini API key<input type="password" autoComplete="off" value={apiKey} onChange={e => { setApiKey(e.target.value); setConsent(false); }} placeholder="Enter a key for this session only"/></label>
   <label className="consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} disabled={!apiKey.trim()}/><span>I agree to send minimized calendar commitments, receipt observations and routine preferences to Google Gemini when generating a plan. Raw email bodies are not sent. I can clear the key to stop future requests.</span></label>
   <div className="modal-actions"><button className="button secondary" onClick={() => { setApiKey(''); setConsent(false); }} disabled={totalBusy || !apiKey}>Clear AI key</button><button className="button primary" disabled={totalBusy} onClick={() => { setPanel(null); void build(); }}>Generate {provider.mode === 'demo' ? 'demo' : 'live'} plan<ArrowRight size={16}/></button></div>
   {error && <p className="notice" role="alert">{error}</p>}<p className="tiny setup-privacy"><ShieldCheck size={13}/>No secrets are saved to local storage. <a href={`${import.meta.env.BASE_URL}privacy.html`} target="_blank" rel="noreferrer">Privacy details</a></p>
  </Modal>}
  {panel === 'activity' && <Modal title="The little things, taken care of." onClose={() => setPanel(null)} wide><p className="muted">{provider.mode === 'demo' ? 'Local demo activity. No changes have been made to your Google account.' : 'Actions recorded by your connected provider.'}</p>{activity.length ? <div className="activity-list">{activity.map((row, index) => <div key={`${row.actionId}-${index}`}><span className="activity-check"><Check size={17}/></span><div><strong>{row.title}</strong><p>{fullTime(row.start, preferences.timeZone)} · {row.status}</p>{safeUrl(row.eventUrl) && <a href={safeUrl(row.eventUrl)} target="_blank" rel="noreferrer">View event ↗</a>}</div></div>)}</div> : <div className="empty-activity"><Unplug size={32}/><h3>Nothing added yet.</h3><p>Choose a suggestion and review it. Approved actions will appear here.</p></div>}{safeUrl(provider.getSpreadsheetUrl()) && <a className="button secondary" href={safeUrl(provider.getSpreadsheetUrl())} target="_blank" rel="noreferrer"><Sheet size={16}/>Open activity workbook<ArrowUpRight size={14}/></a>}</Modal>}
  {panel === 'about' && <Modal title="A day woven around you." onClose={() => setPanel(null)}><div className="how-it-works"><div><Mail/><h3>Notice your rhythm</h3><p>Read relevant receipts, calendar commitments and your saved routines. Email delivery times are never treated as consumption times.</p></div><div><Moon/><h3>Make a thoughtful plan</h3><p>Find time for rest, coffee and lunch. Optional Gemini reasoning can help explain the evidence; scheduling rules validate the proposed times.</p></div><div><Coffee/><h3>Choose the little changes</h3><p>Select what fits, review the exact events, then approve Calendar and Sheets writes. Plans alone never write to your apps.</p></div></div></Modal>}
 </div>;
}
