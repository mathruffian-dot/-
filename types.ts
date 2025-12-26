
export enum TeachingMode {
  LECTURE = '講述教學',
  GROUP_DISCUSSION = '小組討論',
  PRACTICE = '實作/演算',
  DIGITAL_USE = '數位運用'
}

export enum TeachingAction {
  POSITIVE_ENCOURAGEMENT = '正向鼓勵',
  REGULATION = '糾正規範',
  OPEN_QUESTION = '開放提問',
  CLOSED_QUESTION = '封閉提問',
  PATROLLING = '巡視走動'
}

export enum EngagementLevel {
  HIGH = '高',
  MEDIUM = '中',
  LOW = '低'
}

export interface ObservationLog {
  timestamp: string;
  type: 'MODE_CHANGE' | 'ACTION' | 'ENGAGEMENT' | 'NOTE';
  label: string;
  value?: string | number;
}

export interface SessionData {
  startTime: number;
  subject: string;
  modes: Record<string, number>; // mode name -> seconds
  actions: Record<string, number>; // action name -> count
  logs: ObservationLog[];
  engagementHistory: { timestamp: string, level: EngagementLevel }[];
}
