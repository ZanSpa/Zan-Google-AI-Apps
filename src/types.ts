export type Priority = 'low' | 'medium' | 'high';

export type EffortLevel = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  importance: number; // 1-5
  urgency: number; // 1-5
  effort: EffortLevel;
  status: 'pending' | 'completed' | 'skipped';
  createdAt: string;
  suggestedOrder: number;
}

export interface FocusSession {
  taskId: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'completed' | 'paused';
}
