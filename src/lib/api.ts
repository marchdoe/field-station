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
export function getConfig(projectPath?: string): Promise<ConfigResponse> {
  const url = projectPath
    ? `/api/config?projectPath=${encodeURIComponent(projectPath)}`
    : "/api/config";
  return apiFetch<ConfigResponse>(url);
}

export function updateConfigSetting(params: {
  keyPath: string;
  value: unknown;
  projectPath?: string;
}): Promise<void> {
  // Go API expects keyPath as string array
  return apiFetch("/api/config/setting", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      keyPath: params.keyPath.split("."),
      value: params.value,
      ...(params.projectPath ? { projectPath: params.projectPath } : {}),
    }),
  });
}

export function deleteConfigSetting(params: {
  keyPath: string;
  projectPath?: string;
}): Promise<void> {
  return apiFetch("/api/config/setting", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      keyPath: params.keyPath.split("."),
      ...(params.projectPath ? { projectPath: params.projectPath } : {}),
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
export function getAgents(scope: "global" | "project", projectPath?: string): Promise<AgentFile[]> {
  const params = new URLSearchParams({ scope });
  if (projectPath) params.set("projectPath", projectPath);
  return apiFetch<AgentFile[]>(`/api/agents?${params}`);
}

export function getAgent(
  name: string,
  scope: "global" | "project",
  projectPath?: string,
): Promise<AgentDetail> {
  const params = new URLSearchParams({ scope });
  if (projectPath) params.set("projectPath", projectPath);
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
  projectPath?: string,
): Promise<void> {
  return apiFetch(`/api/agents/${encodeURIComponent(name)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope, ...(projectPath ? { projectPath } : {}) }),
  });
}

// Commands (Go API returns flat CommandFile[] — derive folders client-side)
export function getCommands(
  scope: "global" | "project",
  projectPath?: string,
): Promise<CommandFile[]> {
  const params = new URLSearchParams({ scope });
  if (projectPath) params.set("projectPath", projectPath);
  return apiFetch<CommandFile[]>(`/api/commands?${params}`);
}

export function getCommand(
  scope: string,
  folder: string,
  name: string,
  projectPath?: string,
): Promise<CommandDetail> {
  const params = new URLSearchParams();
  if (projectPath) params.set("projectPath", projectPath);
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
  projectPath?: string,
): Promise<void> {
  const params = new URLSearchParams();
  if (projectPath) params.set("projectPath", projectPath);
  const qs = params.toString();
  return apiFetch(
    `/api/commands/${encodeURIComponent(scope)}/${encodeURIComponent(folder)}/${encodeURIComponent(name)}${qs ? `?${qs}` : ""}`,
    { method: "DELETE" },
  );
}

// Skills
export function getSkills(scope: "global" | "project", projectPath?: string): Promise<SkillFile[]> {
  const params = new URLSearchParams({ scope });
  if (projectPath) params.set("projectPath", projectPath);
  return apiFetch<SkillFile[]>(`/api/skills?${params}`);
}

export function getSkill(scope: string, name: string, projectPath?: string): Promise<SkillDetail> {
  const params = new URLSearchParams();
  if (projectPath) params.set("projectPath", projectPath);
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

export function deleteSkill(scope: string, name: string, projectPath?: string): Promise<void> {
  const params = new URLSearchParams();
  if (projectPath) params.set("projectPath", projectPath);
  const qs = params.toString();
  return apiFetch(
    `/api/skills/${encodeURIComponent(scope)}/${encodeURIComponent(name)}${qs ? `?${qs}` : ""}`,
    { method: "DELETE" },
  );
}

// Hooks
export function getHooks(projectPath?: string): Promise<HooksResponse> {
  const url = projectPath
    ? `/api/hooks?projectPath=${encodeURIComponent(projectPath)}`
    : "/api/hooks";
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
export function search(q: string, projectPath?: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q });
  if (projectPath) params.set("projectPath", projectPath);
  return apiFetch<SearchResult[]>(`/api/search?${params}`);
}

export function createResource(data: {
  scope: "global" | "project";
  type: "agent" | "command" | "skill";
  name: string;
  folder?: string;
  projectPath?: string;
  frontmatter: Record<string, string>;
  body: string;
}): Promise<void> {
  const { scope, type, name, folder, projectPath, frontmatter, body } = data;
  if (type === "agent") {
    return createAgent({
      scope,
      name,
      body,
      description: frontmatter.description,
      tools: frontmatter.tools,
      color: frontmatter.color,
      ...(projectPath ? { projectPath } : {}),
    }).then(() => undefined);
  }
  if (type === "command") {
    if (!folder) throw new Error("folder is required for command");
    return createCommand({
      scope,
      name,
      folder,
      body,
      ...(projectPath ? { projectPath } : {}),
    }).then(() => undefined);
  }
  if (type === "skill") {
    return createSkill({
      scope,
      name,
      body,
      description: frontmatter.description,
      ...(projectPath ? { projectPath } : {}),
    }).then(() => undefined);
  }
  throw new Error(`Unknown resource type: ${type}`);
}
