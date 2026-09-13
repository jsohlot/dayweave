import { ArrowUpRight, Utensils } from 'lucide-react';
import type { DayPlan, MealIdeas } from '../types';

export function MealIdeasView({ ideas, plan, onEdit, disabled }: { ideas: MealIdeas; plan: DayPlan; onEdit: () => void; disabled: boolean }) {
 return <section className="meal-ideas" aria-label="Food routine ideas">
  <div className="meal-heading"><span className="card-category"><Utensils size={18}/> YOUR CHOSEN FOOD GOAL</span><button className="text-button" onClick={onEdit} disabled={disabled}>Edit goal</button></div>
  <h2>A little protein, in familiar places.</h2>
  <p className="meal-intro">You chose “Include more protein.” Here are optional ideas for the breaks already in your plan.</p>
  {ideas.ideas.length ? <div className="meal-options">{ideas.ideas.map(idea => <article key={idea.merchant}>
   <div className="meal-option-heading"><h3>{idea.merchant}</h3><span>{idea.kind === 'groceries' ? 'Next grocery trip' : plan.cards.find(card => card.kind === idea.kind)?.timeLabel}</span></div>
   <small>{idea.receiptCount} {plan.mode === 'demo' ? 'synthetic ' : ''}receipt{idea.receiptCount === 1 ? '' : 's'} observed</small>
   <p>{idea.description}</p>
   {idea.menuUrl && <a href={idea.menuUrl} target="_blank" rel="noreferrer">Explore {idea.merchant} menu <ArrowUpRight size={12}/></a>}
  </article>)}</div> : <p className="meal-empty">There isn’t enough receipt evidence to suggest a familiar place. Check the schedule above for available meal breaks.</p>}
  <details className="meal-coverage"><summary>What these ideas are based on</summary><p>{ideas.coverage}</p><p>Menu links are information only. No order is placed, and the food goal is not a nutrition assessment.</p></details>
 </section>;
}
