export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

export type HookEvent =
  | "SessionStart"
  | "UserPromptSubmit"
  | "PreToolUse"
  | "PostToolUse"
  | "Notification"
  | "Stop"
  | "SubagentStop";

export interface HookDefinition {
  hooks: Array<{
    type: "command";
    command: string;
  }>;
  matcher?: string;
}

export interface ClaudeSettings {
  hooks?: Record<HookEvent, HookDefinition[]>;
  statusLine?: { type: "command"; command: string };
  enabledPlugins?: Record<string, boolean>;
  skipDangerousModePermissionPrompt?: boolean;
  env?: Record<string, string>;
}

export interface ClaudeSettingsLocal {
  permissions?: {
    allow?: string[];
    deny?: string[];
  };
}

export type ConfigLayerSource = "global" | "global-local" | "project" | "project-local";

export interface ConfigLayer {
  source: ConfigLayerSource;
  filePath: string;
  exists: boolean;
  content: JsonObject | null;
}

export interface EffectiveConfig {
  merged: JsonObject;
  layers: ConfigLayer[];
}

export interface AgentFile {
  name: string;
  description: string;
  fileName: string;
  filePath: string;
  tools?: string;
  color?: string;
  bodyPreview: string;
  isEditable: boolean;
}

export interface CommandFile {
  name: string;
  fileName: string;
  filePath: string;
  folder: string;
  bodyPreview: string;
  isEditable: boolean;
}

export interface CommandDetail {
  name: string;
  fileName: string;
  filePath: string;
  folder: string;
  body: string;
  isEditable: boolean;
}

export interface AgentDetail {
  name: string;
  description: string;
  fileName: string;
  filePath: string;
  tools?: string;
  color?: string;
  body: string;
  isEditable: boolean;
}

export interface SkillDetail {
  name: string;
  description: string;
  folderName: string;
  filePath: string;
  allowedTools?: string;
  body: string;
  isEditable: boolean;
}

export interface SkillFile {
  name: string;
  description: string;
  folderName: string;
  filePath: string;
  allowedTools?: string;
  bodyPreview: string;
  isEditable: boolean;
}

export interface HookScript {
  fileName: string;
  filePath: string;
  contentPreview: string;
}

export interface PluginInfo {
  id: string;
  scope: string;
  installPath: string;
  version: string;
  installedAt: string;
  lastUpdated: string;
  gitCommitSha: string;
  enabled: boolean;
  homepage?: string;
  repository?: string;
}

export interface ProjectInfo {
  encodedPath: string;
  decodedPath: string;
  exists: boolean;
  hasClaudeDir: boolean;
  hasClaudeMd: boolean;
  agentCount: number;
  commandCount: number;
  skillCount: number;
}

export interface ProjectSummary {
  path: string;
  encodedPath: string;
  exists: boolean;
  hasClaudeDir: boolean;
  hasClaudeMd: boolean;
  claudeMdPreview: string;
  settings: ConfigLayer | null;
  settingsLocal: ConfigLayer | null;
  agentCount: number;
  commandFolderCount: number;
  commandCount: number;
  skillCount: number;
}

export interface GlobalStats {
  settingsExists: boolean;
  settingsLocalExists: boolean;
  agentCount: number;
  commandFolderCount: number;
  commandCount: number;
  skillCount: number;
  hookScriptCount: number;
  pluginCount: number;
  enabledPluginCount: number;
  projectCount: number;
}
