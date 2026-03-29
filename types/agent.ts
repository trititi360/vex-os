export type AgentStatus = 'running' | 'idle' | 'done' | 'error';

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  currentTask: string;
  startTime: Date;
  progress: number; // 0–100
  logs: string[];
  tokenUsage: number;
  errorMessage?: string;
}

export interface SystemStats {
  totalAgents: number;
  activeCount: number;
  completedToday: number;
  errorCount: number;
  totalTokens: number;
}
