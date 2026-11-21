import type { Administrator, AgentStatus, ChatMessage, Client, CommandJob, DashboardData, Skill } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(payload.error ?? `Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  dashboard: () => request<DashboardData>("/dashboard"),
  clients: () => request<Client[]>("/clients"),
  skills: () => request<Skill[]>("/skills"),
  administrators: () => request<Administrator[]>("/administrators"),
  commands: () => request<CommandJob[]>("/commands"),
  messages: () => request<ChatMessage[]>("/agent/messages"),
  agentStatus: () => request<AgentStatus>("/agent/status"),
  updateSkill: (id: number, enabled: boolean) =>
    request<Skill>(`/skills/${id}`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
  createAdministrator: (payload: { name: string; email: string; role: string }) =>
    request<Administrator>("/administrators", { method: "POST", body: JSON.stringify(payload) }),
  createCommand: (payload: { command: string; scope: "client" | "all"; targetId?: string }) =>
    request<CommandJob>("/commands", { method: "POST", body: JSON.stringify(payload) }),
  chat: (message: string) =>
    request<{ message: ChatMessage; source: string }>("/agent/chat", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
};
