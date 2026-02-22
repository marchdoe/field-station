import type { components } from "./api-types.js";

export type ConfigLayer = components["schemas"]["ConfigLayer"];
export type ConfigResponse = components["schemas"]["ConfigResponse"];
export type AgentFile = components["schemas"]["AgentFile"];
export type AgentDetail = components["schemas"]["AgentDetail"];
export type CommandFile = components["schemas"]["CommandFile"];
export type CommandDetail = components["schemas"]["CommandDetail"];
export type SkillFile = components["schemas"]["SkillFile"];
export type SkillDetail = components["schemas"]["SkillDetail"];
export type HooksResponse = components["schemas"]["HooksResponse"];
export type FeaturesData = components["schemas"]["FeaturesData"];
export type Feature = components["schemas"]["Feature"];
export type BackupFile = components["schemas"]["BackupFile"];
export type ProjectFile = components["schemas"]["ProjectFile"];
export type PluginFile = components["schemas"]["PluginFile"];
export type SearchResult = components["schemas"]["SearchResult"];
export type ConfigLayerSource = components["schemas"]["ConfigLayer"]["source"];
export type FeatureCategory =
  | "experimental"
  | "model"
  | "ui"
  | "security"
  | "telemetry"
  | "advanced";

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    throw new Error(
      typeof body.error === "string" ? body.error : `API error: ${res.status} ${res.statusText}`,
    );
  }
  return res.json() as Promise<T>;
}

// Config
export function getConfig(projectId?: string): Promise<ConfigResponse> {
  const url = projectId ? `/api/config?projectId=${projectId}` : "/api/config";
  return apiFetch<ConfigResponse>(url);
}

export function updateConfigSetting(params: {
  keyPath: string;
  value: unknown;
  projectId?: string;
}): Promise<void> {
  // Go API expects keyPath as string array
  return apiFetch("/api/config/setting", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      keyPath: params.keyPath.split("."),
      value: params.value,
      ...(params.projectId ? { projectId: params.projectId } : {}),
    }),
  });
}

export function deleteConfigSetting(params: {
  keyPath: string;
  projectId?: string;
}): Promise<void> {
  return apiFetch("/api/config/setting", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      keyPath: params.keyPath.split("."),
      ...(params.projectId ? { projectId: params.projectId } : {}),
    }),
  });
}

// direction: "up" promotes global→local, "down" demotes local→global
export function moveConfigSetting(params: {
  keyPath: string;
  direction: "up" | "down";
}): Promise<void> {
  return apiFetch("/api/config/setting/move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      keyPath: params.keyPath.split("."),
      direction: params.direction,
    }),
  });
}

// Agents
export function getAgents(scope: "global" | "project", projectId?: string): Promise<AgentFile[]> {
  const params = new URLSearchParams({ scope });
  if (projectId) params.set("projectId", projectId);
  return apiFetch<AgentFile[]>(`/api/agents?${params}`);
}

export function getAgent(
  name: string,
  scope: "global" | "project",
  projectId?: string,
): Promise<AgentDetail> {
  const params = new URLSearchParams({ scope });
  if (projectId) params.set("projectId", projectId);
  return apiFetch<AgentDetail>(`/api/agents/${encodeURIComponent(name)}?${params}`);
}

export function createAgent(data: components["schemas"]["CreateAgentRequest"]): Promise<AgentFile> {
  return apiFetch<AgentFile>("/api/agents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function updateAgent(
  name: string,
  data: components["schemas"]["UpdateAgentRequest"],
): Promise<AgentDetail> {
  return apiFetch<AgentDetail>(`/api/agents/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function deleteAgent(
  name: string,
  scope: "global" | "project",
  projectId?: string,
): Promise<void> {
  return apiFetch(`/api/agents/${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope, ...(projectId ? { projectId } : {}) }),
  });
}

// Commands (Go API returns flat CommandFile[] — derive folders client-side)
export function getCommands(
  scope: "global" | "project",
  projectId?: string,
): Promise<CommandFile[]> {
  const params = new URLSearchParams({ scope });
  if (projectId) params.set("projectId", projectId);
  return apiFetch<CommandFile[]>(`/api/commands?${params}`);
}

export function getCommand(
  scope: string,
  folder: string,
  name: string,
  projectId?: string,
): Promise<CommandDetail> {
  const params = new URLSearchParams();
  if (projectId) params.set("projectId", projectId);
  const qs = params.toString();
  return apiFetch<CommandDetail>(
    `/api/commands/${encodeURIComponent(scope)}/${encodeURIComponent(folder)}/${encodeURIComponent(name)}${qs ? `?${qs}` : ""}`,
  );
}

export function createCommand(
  data: components["schemas"]["CreateCommandRequest"],
): Promise<CommandFile> {
  return apiFetch<CommandFile>("/api/commands", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function updateCommand(
  scope: string,
  folder: string,
  name: string,
  data: components["schemas"]["UpdateCommandRequest"],
): Promise<CommandDetail> {
  return apiFetch<CommandDetail>(
    `/api/commands/${encodeURIComponent(scope)}/${encodeURIComponent(folder)}/${encodeURIComponent(name)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
}

export function deleteCommand(
  scope: string,
  folder: string,
  name: string,
  projectId?: string,
): Promise<void> {
  const params = new URLSearchParams();
  if (projectId) params.set("projectId", projectId);
  const qs = params.toString();
  return apiFetch(
    `/api/commands/${encodeURIComponent(scope)}/${encodeURIComponent(folder)}/${encodeURIComponent(name)}${qs ? `?${qs}` : ""}`,
    { method: "DELETE" },
  );
}

// Skills
export function getSkills(scope: "global" | "project", projectId?: string): Promise<SkillFile[]> {
  const params = new URLSearchParams({ scope });
  if (projectId) params.set("projectId", projectId);
  return apiFetch<SkillFile[]>(`/api/skills?${params}`);
}

export function getSkill(scope: string, name: string, projectId?: string): Promise<SkillDetail> {
  const params = new URLSearchParams();
  if (projectId) params.set("projectId", projectId);
  const qs = params.toString();
  return apiFetch<SkillDetail>(
    `/api/skills/${encodeURIComponent(scope)}/${encodeURIComponent(name)}${qs ? `?${qs}` : ""}`,
  );
}

export function createSkill(data: components["schemas"]["CreateSkillRequest"]): Promise<SkillFile> {
  return apiFetch<SkillFile>("/api/skills", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function updateSkill(
  scope: string,
  name: string,
  data: components["schemas"]["UpdateSkillRequest"],
): Promise<SkillDetail> {
  return apiFetch<SkillDetail>(
    `/api/skills/${encodeURIComponent(scope)}/${encodeURIComponent(name)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
}

export function deleteSkill(scope: string, name: string, projectId?: string): Promise<void> {
  const params = new URLSearchParams();
  if (projectId) params.set("projectId", projectId);
  const qs = params.toString();
  return apiFetch(
    `/api/skills/${encodeURIComponent(scope)}/${encodeURIComponent(name)}${qs ? `?${qs}` : ""}`,
    { method: "DELETE" },
  );
}

// Hooks
export function getHooks(projectId?: string): Promise<HooksResponse> {
  const url = projectId ? `/api/hooks?projectId=${projectId}` : "/api/hooks";
  return apiFetch<HooksResponse>(url);
}

// Features
export function getFeatures(): Promise<FeaturesData> {
  return apiFetch<FeaturesData>("/api/features");
}

export function updateFeature(
  key: string,
  data: components["schemas"]["UpdateFeatureRequest"],
): Promise<void> {
  return apiFetch(`/api/features/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function deleteFeature(key: string): Promise<void> {
  return apiFetch(`/api/features/${encodeURIComponent(key)}`, { method: "DELETE" });
}

// Plugins
export function getPlugins(): Promise<PluginFile[]> {
  return apiFetch<PluginFile[]>("/api/plugins");
}

// Backups
export function getBackups(): Promise<BackupFile[]> {
  return apiFetch<BackupFile[]>("/api/backups");
}

export function restoreBackup(id: string): Promise<void> {
  return apiFetch(`/api/backups/${encodeURIComponent(id)}/restore`, { method: "POST" });
}

// Projects
export function getProjects(): Promise<ProjectFile[]> {
  return apiFetch<ProjectFile[]>("/api/projects");
}

// Search
export function search(q: string, projectId?: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q });
  if (projectId) params.set("projectId", projectId);
  return apiFetch<SearchResult[]>(`/api/search?${params}`);
}

export function createResource(data: {
  scope: "global" | "project";
  type: "agent" | "command" | "skill";
  name: string;
  folder?: string;
  projectId?: string;
  frontmatter: Record<string, string>;
  body: string;
}): Promise<void> {
  const { scope, type, name, folder, projectId, frontmatter, body } = data;
  if (type === "agent") {
    return createAgent({
      scope,
      name,
      body,
      description: frontmatter.description,
      tools: frontmatter.tools,
      color: frontmatter.color,
      ...(projectId ? { projectId } : {}),
    }).then(() => undefined);
  }
  if (type === "command") {
    if (!folder) throw new Error("folder is required for command");
    return createCommand({
      scope,
      name,
      folder,
      body,
      ...(projectId ? { projectId } : {}),
    }).then(() => undefined);
  }
  if (type === "skill") {
    return createSkill({
      scope,
      name,
      body,
      description: frontmatter.description,
      ...(projectId ? { projectId } : {}),
    }).then(() => undefined);
  }
  throw new Error(`Unknown resource type: ${type}`);
}

// Instructions (CLAUDE.md files)
export type InstructionsFile = components["schemas"]["InstructionsFile"];
export type InstructionsResponse = components["schemas"]["InstructionsResponse"];

export function getInstructions(
  scope: "global" | "project",
  projectId?: string,
): Promise<InstructionsResponse> {
  const params = new URLSearchParams({ scope });
  if (projectId) params.set("projectId", projectId);
  return apiFetch<InstructionsResponse>(`/api/instructions?${params}`);
}

export function updateInstruction(params: {
  scope: "global" | "project";
  file: "main" | "local";
  content: string;
  projectId?: string;
}): Promise<void> {
  return apiFetch("/api/instructions", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scope: params.scope,
      file: params.file,
      content: params.content,
      ...(params.projectId ? { projectId: params.projectId } : {}),
    }),
  });
}

// Memory files (per-project)
export type MemoryFile = components["schemas"]["MemoryFile"];
export type MemoryDetail = components["schemas"]["MemoryDetail"];

export function listMemory(projectId: string): Promise<MemoryFile[]> {
  return apiFetch<MemoryFile[]>(`/api/memory?projectId=${encodeURIComponent(projectId)}`);
}

export function getMemory(filename: string, projectId: string): Promise<MemoryDetail> {
  return apiFetch<MemoryDetail>(
    `/api/memory/${encodeURIComponent(filename)}?projectId=${encodeURIComponent(projectId)}`,
  );
}

export function createMemory(params: {
  filename: string;
  content: string;
  projectId: string;
}): Promise<MemoryFile> {
  return apiFetch<MemoryFile>("/api/memory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}

export function updateMemory(params: {
  filename: string;
  content: string;
  projectId: string;
}): Promise<void> {
  return apiFetch(`/api/memory/${encodeURIComponent(params.filename)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: params.content, projectId: params.projectId }),
  });
}

export function deleteMemory(filename: string, projectId: string): Promise<void> {
  return apiFetch(
    `/api/memory/${encodeURIComponent(filename)}?projectId=${encodeURIComponent(projectId)}`,
    { method: "DELETE" },
  );
}
