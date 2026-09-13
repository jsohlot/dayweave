// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MealIdeasView } from './MealIdeasView';
import { buildPlan } from '../lib/planner';
import { DEFAULT_PREFERENCES } from '../lib/defaults';
afterEach(cleanup);
it('does not promise a lunch reservation when the calendar has no gap', () => {
 const plan=buildPlan('2026-09-14',{...DEFAULT_PREFERENCES,foodGoal:'protein'},{receipts:[],warnings:[],events:[{id:'busy',title:'Busy all day',start:'2026-09-14T00:00:00-07:00',end:'2026-09-15T00:00:00-07:00',allDay:true}]});
 expect(plan.actions.some(a=>a.kind==='lunch')).toBe(false);
 render(<MealIdeasView ideas={plan.mealIdeas!} plan={plan} onEdit={()=>{}} disabled={false}/>);
 expect(screen.queryByText(/lunch break is still available to reserve/i)).toBeNull();
 expect(screen.getByText(/isn’t enough receipt evidence/)).toBeTruthy();
});
