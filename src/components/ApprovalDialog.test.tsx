// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ApprovalDialog } from './ApprovalDialog';
import type { DayPlan } from '../types';
afterEach(cleanup);
const plan: DayPlan = { id: 'plan', generatedAt: '2026-09-13T10:00:00Z', headline: 'Your day', summary: 'A plan', cards: [], evidence: [], events: [], trace: [], warnings: [], aiUsed: false, date: '2026-09-14', mode: 'live', timeZone: 'America/Los_Angeles', actions: [
 { id: 'sleep', title: 'Wind down', kind: 'sleep', start: '2026-09-13T21:00:00-07:00', end: '2026-09-13T21:30:00-07:00', description: 'Put tomorrow to rest.', evidenceIds: [], selected: true },
 { id: 'lunch', title: 'Lunch break', kind: 'lunch', start: '2026-09-14T12:30:00-07:00', end: '2026-09-14T13:00:00-07:00', description: 'A protected pause.', evidenceIds: [], selected: false },
]};
it('shows only selected exact events and requires explicit confirmation', () => {
 const confirm = vi.fn();
 render(<ApprovalDialog plan={plan} actionIds={['sleep']} busy={false} onCancel={() => {}} onConfirm={confirm} />);
 expect(screen.getByRole('dialog')).toBeTruthy();
 expect(screen.getByText('Wind down')).toBeTruthy();
 expect(screen.queryByText('Lunch break')).toBeNull();
 expect(screen.getByText(/Google Sheets/)).toBeTruthy();
 expect(screen.getByText(/Sep 13/)).toBeTruthy();
 expect(confirm).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button', { name: 'Confirm & add 1 event' }));
 expect(confirm).toHaveBeenCalledTimes(1);
});
it('prevents confirmation while saving', () => {
 const confirm = vi.fn(); const cancel = vi.fn();
 render(<ApprovalDialog plan={plan} actionIds={['sleep']} busy onCancel={cancel} onConfirm={confirm} />);
 const button = screen.getByRole('button', { name: /Adding/ }) as HTMLButtonElement;
 expect(button.disabled).toBe(true);
 fireEvent.click(button);
 expect(confirm).not.toHaveBeenCalled();
});
