import { useState } from 'react';
import type { Preferences } from '../types';
import { Modal } from './Modal';
export function PreferencesPanel({ preferences, busy, onClose, onUse, onSave, mode }: { preferences: Preferences; busy: boolean; onClose: () => void; onUse: (value: Preferences) => void; onSave: (value: Preferences) => Promise<void>; mode: 'demo' | 'live' }) {
 const [draft, setDraft] = useState({ ...preferences }); const [message, setMessage] = useState('');
 function change(key: keyof Preferences, value: string | number) { setMessage(''); setDraft(old => ({ ...old, [key]: value })); }
 function valid() { try { new Intl.DateTimeFormat('en-US', { timeZone: draft.timeZone }); } catch { setMessage('Enter a valid time zone, such as America/Los_Angeles.'); return false; } return true; }
 const numberFields: { key: keyof Preferences; label: string; min: number; max: number; step?: number }[] = [ { key: 'sleepHours', label: 'Sleep target · hours', min: 4, max: 12, step: .5 }, { key: 'windDownMinutes', label: 'Wind-down · minutes', min: 0, max: 180 }, { key: 'sleepLatencyMinutes', label: 'Time to fall asleep · minutes', min: 0, max: 120 }, { key: 'morningMinutes', label: 'Morning routine · minutes', min: 0, max: 240 }, { key: 'commuteMinutes', label: 'Commute · minutes', min: 0, max: 240 }, { key: 'lunchMinutes', label: 'Lunch break · minutes', min: 10, max: 120 } ];
 return <Modal title="Make it your kind of day." onClose={onClose} busy={busy} wide>
  <p className="muted">Your routines guide the plan. Use them for this preview, or explicitly save them to {mode === 'demo' ? 'the demo workbook' : 'your Google Sheets workbook'}.</p>
  <form onSubmit={e => { e.preventDefault(); if (valid()) onUse(draft); }}>
   <div className="form-grid"><label>Your name<input value={draft.name} onChange={e => change('name', e.target.value)} maxLength={80}/></label><label>Time zone<input required value={draft.timeZone} onChange={e => change('timeZone', e.target.value)} placeholder="America/Los_Angeles"/></label>
   {numberFields.map(field => <label key={field.key}>{field.label}<input type="number" required min={field.min} max={field.max} step={field.step ?? 5} value={draft[field.key]} onChange={e => change(field.key, e.target.valueAsNumber)}/></label>)}
   <label>Usual wake time<input required type="time" value={draft.defaultWakeTime} onChange={e => change('defaultWakeTime', e.target.value)}/></label><label>Preferred coffee time<input required type="time" value={draft.coffeeTime} onChange={e => change('coffeeTime', e.target.value)}/></label><label>Preferred lunch time<input required type="time" value={draft.lunchTime} onChange={e => change('lunchTime', e.target.value)}/></label><label>Food goal<select value={draft.foodGoal ?? 'none'} onChange={e => change('foodGoal', e.target.value)}><option value="none">No food goal</option><option value="protein">Include more protein</option></select></label><label>Food preferences<input value={draft.dietaryPreferences} maxLength={240} onChange={e => change('dietaryPreferences', e.target.value)} placeholder="What sounds good to you?"/></label></div>
   {message && <p className="notice" role="status">{message}</p>}
   <div className="modal-actions"><button className="button secondary" disabled={busy} type="button" onClick={async e => { const form = e.currentTarget.form; if (!form?.reportValidity() || !valid()) return; try { await onSave(draft); setMessage('Preferences saved. Use for this plan to refresh your preview.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save preferences. Try again.'); } }}>Save preferences to Sheets</button><button className="button primary" type="submit" disabled={busy}>Use for this plan</button></div>
  </form>
 </Modal>;
}
