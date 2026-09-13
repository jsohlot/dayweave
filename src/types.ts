export type AppName = 'gmail' | 'calendar' | 'sheets';
export type Mode = 'demo' | 'live';
export interface Preferences { name: string; timeZone: string; sleepHours: number; windDownMinutes: number; sleepLatencyMinutes: number; morningMinutes: number; commuteMinutes: number; defaultWakeTime: string; coffeeTime: string; lunchTime: string; lunchMinutes: number; dietaryPreferences: string; foodGoal?: 'none' | 'protein'; }
export interface CalendarEvent { id: string; title: string; start: string; end: string; allDay?: boolean; location?: string; url?: string; isDayweave?: boolean; }
export interface Receipt { id: string; merchant: string; merchantKey?: 'starbucks' | 'chipotle' | 'costco'; category: 'coffee' | 'meal' | 'other'; purchasedAt: string | null; receivedAt: string; items: string[]; sourceUrl?: string; timeSource: 'receipt' | 'email' | 'unknown'; }
export interface Evidence { id: string; app: AppName | 'preferences'; label: string; detail: string; url?: string; }
export interface PlanAction { id: string; kind: 'sleep' | 'coffee' | 'lunch' | 'activity'; title: string; description: string; start: string; end: string; evidenceIds: string[]; selected: boolean; }
export interface PlanCard { id: string; kind: PlanAction['kind']; title: string; timeLabel: string; summary: string; reasoning: string; evidenceIds: string[]; confidence: 'observed' | 'preference' | 'limited'; actionId?: string; }
export interface TraceEntry { id: string; tool: string; app?: AppName; status: 'running' | 'success' | 'error' | 'skipped'; message: string; at: string; durationMs?: number; }
export interface MealIdea { merchant: string; kind: 'coffee' | 'lunch' | 'groceries'; description: string; receiptCount: number; menuUrl?: string; }
export interface MealIdeas { ideas: MealIdea[]; coverage: string; }
export interface DayPlan { id: string; date: string; timeZone: string; generatedAt: string; mode: Mode; headline: string; summary: string; cards: PlanCard[]; actions: PlanAction[]; evidence: Evidence[]; events: CalendarEvent[]; trace: TraceEntry[]; warnings: string[]; aiUsed: boolean; mealIdeas?: MealIdeas; }
export interface ApplyResult { actionId: string; status: 'created' | 'already_exists' | 'conflict' | 'error'; message: string; eventUrl?: string; eventId?: string; logged?: boolean; }
export interface AppConnection { app: AppName; connected: boolean; detail: string; }
export interface SourceData { events: CalendarEvent[]; receipts: Receipt[]; warnings: string[]; }
export interface ActivityRow { actionId: string; date: string; title: string; start: string; end: string; status: string; eventId: string; eventUrl: string; }
export interface Provider {
  mode: Mode;
  getConnections(): AppConnection[];
  loadSources(date: string, preferences: Preferences, onTrace?: (entry: TraceEntry) => void): Promise<SourceData>;
  readPreferences(): Promise<Partial<Preferences> | null>;
  savePreferences(preferences: Preferences): Promise<void>;
  applyActions(plan: DayPlan, actionIds: string[], onTrace?: (entry: TraceEntry) => void): Promise<ApplyResult[]>;
  getActivity(): Promise<ActivityRow[]>;
  getSpreadsheetUrl(): string | undefined;
  disconnect(): void;
}
export interface GenerateOptions { date: string; preferences: Preferences; provider: Provider; apiKey?: string; onTrace?: (entry: TraceEntry) => void; }
