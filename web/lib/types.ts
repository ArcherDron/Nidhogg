export type View = "overview" | "agent" | "fleet" | "operations" | "skills" | "administrators";

export interface Client {
  id: string;
  hostname: string;
  ipAddress: string;
  os: string;
  status: "online" | "offline" | "attention";
  risk: "low" | "guarded" | "elevated" | "unknown";
  cpu: number;
  memory: number;
  lastSeen: string;
  agentBuild: string;
}

export interface Skill {
  id: number;
  name: string;
  description: string;
  category: string;
  riskLevel: string;
  enabled: boolean;
  updatedAt?: string;
}

export interface Administrator {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  lastActive?: string;
  createdAt?: string;
}

export interface CommandJob {
  id: string;
  command: string;
  scope: "client" | "all";
  targetId?: string;
  targetCount: number;
  status: string;
  requestedBy: string;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface DashboardData {
  endpoints: { total: number; online: number; attention: number };
  openCommands: number;
  threatLevel: string;
  telemetry: Array<{ label: string; healthy: number; signals: number }>;
  updatedAt: string;
}

export interface AgentStatus {
  connected: boolean;
  mode: string;
  model: string;
}
