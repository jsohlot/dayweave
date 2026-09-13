import { CalendarPlus, Check, Sheet } from 'lucide-react';
import type { DayPlan } from '../types';
import { Modal } from './Modal';
import { fullTime } from './format';
export interface ApprovalDialogProps { plan: DayPlan; actionIds: string[]; busy: boolean; onCancel: () => void; onConfirm: () => void; }
export function ApprovalDialog({ plan, actionIds, busy, onCancel, onConfirm }: ApprovalDialogProps) {
 const actions = plan.actions.filter(action => actionIds.includes(action.id));
 return <Modal title="A little room for you." onClose={onCancel} busy={busy}>
  <p className="muted">Review exactly what Dayweave will add. {plan.mode === 'demo' ? 'This is a demo: changes stay in the local demo.' : 'These changes will be made to your connected Google account.'}</p>
  <div className="approval-heading"><CalendarPlus size={18}/><strong>{plan.mode === 'demo' ? 'Demo Calendar' : 'Google Calendar'} · {actions.length} new {actions.length === 1 ? 'event' : 'events'}</strong></div>
  <div className="approval-list">{actions.map(action => <div key={action.id}><Check size={17}/><div><strong>{action.title}</strong><p>{fullTime(action.start, plan.timeZone)} → {fullTime(action.end, plan.timeZone)}</p><p>{action.description}</p></div></div>)}</div>
  <p className="tiny">All times in {plan.timeZone}. Availability is checked again before adding events; existing Dayweave events are not duplicated.</p>
  <div className="write-notice"><Sheet size={20}/><div><strong>{plan.mode === 'demo' ? 'Demo Google Sheets activity log' : 'Google Sheets activity log'}</strong><p>Create a Dayweave workbook if needed, then add one activity row for each successful action: action ID, plan date, event title, start, end, status, event ID and event link. Preferences are not saved by this action.</p></div></div>
  <div className="modal-actions"><button className="button secondary" onClick={onCancel} disabled={busy}>Keep reviewing</button><button className="button primary" disabled={busy || !actions.length} onClick={onConfirm}>{busy ? 'Adding…' : `Confirm & add ${actions.length} ${actions.length === 1 ? 'event' : 'events'}`}</button></div>
 </Modal>;
}
