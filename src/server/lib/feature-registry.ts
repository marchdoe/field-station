export type FeatureCategory =
  | "experimental"
  | "model"
  | "ui"
  | "security"
  | "telemetry"
  | "advanced";

export interface FeatureDefinition {
  key: string;
  type: "env" | "setting";
  name: string;
  description: string;
  category: FeatureCategory;
  valueType: "boolean" | "string" | "number";
  defaultValue?: string;
  options?: string[];
}

export const FEATURE_REGISTRY: FeatureDefinition[] = [
  // --- Experimental ---
  {
    key: "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS",
    type: "env",
    name: "Agent Teams",
    description: "Multi-agent collaboration where one session coordinates teammate sessions.",
    category: "experimental",
    valueType: "boolean",
  },
  {
    key: "CLAUDE_CODE_DISABLE_AUTO_MEMORY",
    type: "env",
    name: "Disable Auto Memory",
    description: "Disable automatic memory recording and recall across sessions.",
    category: "experimental",
    valueType: "boolean",
  },
  {
    key: "CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS",
    type: "env",
    name: "Disable Experimental Betas",
    description: "Disable Anthropic API beta headers. Useful for Bedrock/Vertex gateways.",
    category: "experimental",
    valueType: "boolean",
  },

  // --- Model ---
  {
    key: "alwaysThinkingEnabled",
    type: "setting",
    name: "Always Enable Thinking",
    description: "Enable extended thinking by default for all sessions.",
    category: "model",
    valueType: "boolean",
  },
  {
    key: "CLAUDE_CODE_EFFORT_LEVEL",
    type: "env",
    name: "Effort Level",
    description: "Controls effort level for supported models.",
    category: "model",
    valueType: "string",
    defaultValue: "high",
    options: ["low", "medium", "high"],
  },
  {
    key: "CLAUDE_CODE_MAX_OUTPUT_TOKENS",
    type: "env",
    name: "Max Output Tokens",
    description: "Maximum output tokens per response (up to 64000).",
    category: "model",
    valueType: "number",
    defaultValue: "32000",
  },
  {
    key: "MAX_THINKING_TOKENS",
    type: "env",
    name: "Max Thinking Tokens",
    description: "Override the extended thinking token budget.",
    category: "model",
    valueType: "number",
    defaultValue: "31999",
  },
  {
    key: "DISABLE_PROMPT_CACHING",
    type: "env",
    name: "Disable Prompt Caching",
    description: "Disable prompt caching optimization globally.",
    category: "model",
    valueType: "boolean",
  },
  {
    key: "DISABLE_PROMPT_CACHING_HAIKU",
    type: "env",
    name: "Disable Prompt Caching (Haiku)",
    description: "Disable prompt caching for Haiku models only.",
    category: "model",
    valueType: "boolean",
  },
  {
    key: "DISABLE_PROMPT_CACHING_SONNET",
    type: "env",
    name: "Disable Prompt Caching (Sonnet)",
    description: "Disable prompt caching for Sonnet models only.",
    category: "model",
    valueType: "boolean",
  },
  {
    key: "DISABLE_PROMPT_CACHING_OPUS",
    type: "env",
    name: "Disable Prompt Caching (Opus)",
    description: "Disable prompt caching for Opus models only.",
    category: "model",
    valueType: "boolean",
  },
  {
    key: "CLAUDE_CODE_SUBAGENT_MODEL",
    type: "env",
    name: "Subagent Model",
    description: "Override the model used for subagent tasks.",
    category: "model",
    valueType: "string",
  },
  {
    key: "CLAUDE_CODE_DISABLE_THINKING",
    type: "env",
    name: "Disable Thinking",
    description: "Disable extended thinking entirely.",
    category: "model",
    valueType: "boolean",
  },
  {
    key: "CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING",
    type: "env",
    name: "Disable Adaptive Thinking",
    description: "Disable adaptive thinking token allocation.",
    category: "model",
    valueType: "boolean",
  },
  {
    key: "DISABLE_NON_ESSENTIAL_MODEL_CALLS",
    type: "env",
    name: "Disable Non-Essential Model Calls",
    description: "Disable model calls for non-critical paths like flavor text and tips.",
    category: "model",
    valueType: "boolean",
  },

  // --- UI ---
  {
    key: "spinnerTipsEnabled",
    type: "setting",
    name: "Spinner Tips",
    description: "Show tips in the spinner while Claude is working.",
    category: "ui",
    valueType: "boolean",
    defaultValue: "true",
  },
  {
    key: "terminalProgressBarEnabled",
    type: "setting",
    name: "Terminal Progress Bar",
    description: "Enable the terminal progress bar (iTerm2, Windows Terminal).",
    category: "ui",
    valueType: "boolean",
    defaultValue: "true",
  },
  {
    key: "prefersReducedMotion",
    type: "setting",
    name: "Reduced Motion",
    description: "Reduce or disable UI animations for accessibility.",
    category: "ui",
    valueType: "boolean",
  },
  {
    key: "showTurnDuration",
    type: "setting",
    name: "Show Turn Duration",
    description: "Show turn duration timing after responses.",
    category: "ui",
    valueType: "boolean",
    defaultValue: "true",
  },
  {
    key: "CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION",
    type: "env",
    name: "Prompt Suggestions",
    description: "Enable grayed-out inline prompt suggestions.",
    category: "ui",
    valueType: "boolean",
    defaultValue: "true",
  },
  {
    key: "CLAUDE_CODE_DISABLE_FAST_MODE",
    type: "env",
    name: "Disable Fast Mode",
    description: "Disable the fast output mode toggle.",
    category: "ui",
    valueType: "boolean",
  },
  {
    key: "DISABLE_COST_WARNINGS",
    type: "env",
    name: "Disable Cost Warnings",
    description: "Suppress token usage cost warning messages.",
    category: "ui",
    valueType: "boolean",
  },
  {
    key: "CLAUDE_CODE_DISABLE_TERMINAL_TITLE",
    type: "env",
    name: "Disable Terminal Title",
    description: "Prevent Claude Code from updating the terminal window title.",
    category: "ui",
    valueType: "boolean",
  },
  {
    key: "CLAUDE_CODE_HIDE_ACCOUNT_INFO",
    type: "env",
    name: "Hide Account Info",
    description: "Hide email and organization info from the UI.",
    category: "ui",
    valueType: "boolean",
  },
  {
    key: "teammateMode",
    type: "setting",
    name: "Teammate Mode",
    description: "Agent teams display mode.",
    category: "ui",
    valueType: "string",
    defaultValue: "auto",
    options: ["auto", "in-process", "tmux"],
  },

  // --- Security ---
  {
    key: "skipDangerousModePermissionPrompt",
    type: "setting",
    name: "Skip Dangerous Mode Prompt",
    description: "Skip the confirmation prompt when entering dangerous mode.",
    category: "security",
    valueType: "boolean",
  },
  {
    key: "sandbox.enabled",
    type: "setting",
    name: "Sandbox",
    description: "Enable bash sandboxing (macOS seatbelt, Linux bubblewrap).",
    category: "security",
    valueType: "boolean",
  },
  {
    key: "CLAUDE_CODE_DISABLE_COMMAND_INJECTION_CHECK",
    type: "env",
    name: "Disable Command Injection Check",
    description: "Disable the command injection safety check.",
    category: "security",
    valueType: "boolean",
  },
  {
    key: "enableAllProjectMcpServers",
    type: "setting",
    name: "Auto-Approve Project MCP Servers",
    description: "Auto-approve all MCP servers from project .mcp.json files.",
    category: "security",
    valueType: "boolean",
  },
  {
    key: "disableAllHooks",
    type: "setting",
    name: "Disable All Hooks",
    description: "Disable all hooks and custom status line.",
    category: "security",
    valueType: "boolean",
  },

  // --- Telemetry ---
  {
    key: "DISABLE_TELEMETRY",
    type: "env",
    name: "Disable Telemetry",
    description: "Opt out of Statsig usage telemetry.",
    category: "telemetry",
    valueType: "boolean",
  },
  {
    key: "DISABLE_ERROR_REPORTING",
    type: "env",
    name: "Disable Error Reporting",
    description: "Disable Sentry crash reporting.",
    category: "telemetry",
    valueType: "boolean",
  },
  {
    key: "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
    type: "env",
    name: "Disable Nonessential Traffic",
    description: "Disable autoupdater, bug reporting, error reporting, and telemetry.",
    category: "telemetry",
    valueType: "boolean",
  },
  {
    key: "CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY",
    type: "env",
    name: "Disable Feedback Survey",
    description: "Disable session quality surveys.",
    category: "telemetry",
    valueType: "boolean",
  },

  // --- Advanced ---
  {
    key: "CLAUDE_CODE_DISABLE_BACKGROUND_TASKS",
    type: "env",
    name: "Disable Background Tasks",
    description: "Disable all background task functionality and Ctrl+B shortcut.",
    category: "advanced",
    valueType: "boolean",
  },
  {
    key: "CLAUDE_CODE_ENABLE_TASKS",
    type: "env",
    name: "Enable Task System",
    description: "Toggle between the new task tracking system and the legacy TODO list.",
    category: "advanced",
    valueType: "boolean",
    defaultValue: "true",
  },
  {
    key: "CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING",
    type: "env",
    name: "Disable File Checkpointing",
    description: "Disable automatic file checkpointing.",
    category: "advanced",
    valueType: "boolean",
  },
  {
    key: "DISABLE_AUTO_COMPACT",
    type: "env",
    name: "Disable Auto-Compact",
    description: "Disable automatic context compaction.",
    category: "advanced",
    valueType: "boolean",
  },
  {
    key: "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE",
    type: "env",
    name: "Auto-Compact Threshold",
    description: "Context capacity percentage at which auto-compaction triggers (1-100).",
    category: "advanced",
    valueType: "number",
  },
  {
    key: "respectGitignore",
    type: "setting",
    name: "Respect Gitignore",
    description: "Whether the @ file picker respects .gitignore.",
    category: "advanced",
    valueType: "boolean",
    defaultValue: "true",
  },
  {
    key: "autoUpdatesChannel",
    type: "setting",
    name: "Auto-Updates Channel",
    description: "Release channel for automatic updates.",
    category: "advanced",
    valueType: "string",
    defaultValue: "latest",
    options: ["stable", "latest"],
  },
  {
    key: "DISABLE_AUTOUPDATER",
    type: "env",
    name: "Disable Auto-Updater",
    description: "Prevent automatic background updates.",
    category: "advanced",
    valueType: "boolean",
  },
  {
    key: "ENABLE_TOOL_SEARCH",
    type: "env",
    name: "MCP Tool Search",
    description: "Controls MCP tool search scaling behavior.",
    category: "advanced",
    valueType: "string",
    defaultValue: "auto",
    options: ["auto", "true", "false"],
  },
];

export function getRegistryByKey(): Map<string, FeatureDefinition> {
  return new Map(FEATURE_REGISTRY.map((f) => [f.key, f]));
}
