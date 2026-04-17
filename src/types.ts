export type Priority = 'low' | 'medium' | 'high';

export type EffortLevel = 'low' | 'medium' | 'high';
export type WorkType = 'creative' | 'mechanical';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  importance: number; // 1-5
  urgency: number; // 1-5
  effort: EffortLevel;
  workType: WorkType;
  status: 'pending' | 'completed' | 'skipped';
  createdAt: string;
  suggestedOrder: number;
  reminderMinutes: number; // Minutes before due date to notify
  reminderSent?: boolean;
}

export interface UserSettings {
  defaultReminderMinutes: number;
  notificationsEnabled: boolean;
  energyLevel?: 'creative' | 'mechanical';
}

export interface FocusSession {
  taskId: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'completed' | 'paused';
}
