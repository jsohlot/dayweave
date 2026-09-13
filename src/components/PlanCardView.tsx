import { ArrowUpRight, Coffee, Footprints, Moon, Utensils } from 'lucide-react';
import type { DayPlan, PlanCard } from '../types';
import { safeUrl } from './format';
const icons = { sleep: Moon, coffee: Coffee, lunch: Utensils, activity: Footprints };
const labels = { sleep: 'Rest well', coffee: 'Ease into it', lunch: 'Make space', activity: 'Move a little' };
export function PlanCardView({ card, plan, selected, onSelect, disabled }: { card: PlanCard; plan: DayPlan; selected: boolean; onSelect: () => void; disabled: boolean }) {
 const Icon = icons[card.kind]; const evidence = plan.evidence.filter(item => card.evidenceIds.includes(item.id));
 return <article className={`plan-card card-${card.kind}`}><div className="card-topline"><span className="card-category"><span className="card-icon"><Icon size={21} strokeWidth={1.6}/></span>{labels[card.kind]}</span><span className="confidence">{card.confidence === 'observed' ? 'From your day' : card.confidence === 'preference' ? 'Your routine' : 'Limited history'}</span></div>
  <div className="card-body"><div><h2>{card.title}</h2><p>{card.summary}</p></div><div className="card-time">{card.timeLabel}</div></div>
  <details className="evidence"><summary>Why this fits <span>{evidence.length} {evidence.length === 1 ? 'source' : 'sources'}</span></summary><div><p>{card.reasoning}</p>{evidence.map(item => <div className="evidence-row" key={item.id}><span className={`source-dot ${item.app}`}/><div><strong>{item.label}</strong><p>{item.detail}</p>{safeUrl(item.url) && <a href={safeUrl(item.url)} target="_blank" rel="noreferrer">View source <ArrowUpRight size={12}/></a>}</div></div>)}</div></details>
  {card.actionId && <label className={`select-action ${selected ? 'is-selected' : ''}`}><input type="checkbox" checked={selected} onChange={onSelect} disabled={disabled}/><span>Include in my plan</span><span className="select-hint">Calendar event</span></label>}
 </article>;
}
