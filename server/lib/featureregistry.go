package lib

// FeatureCategory represents the category of a feature flag.
type FeatureCategory string

// Feature category constants for grouping features in the UI.
const (
	FeatureCategoryExperimental FeatureCategory = "experimental"
	FeatureCategoryModel        FeatureCategory = "model"
	FeatureCategoryUI           FeatureCategory = "ui"
	FeatureCategorySecurity     FeatureCategory = "security"
	FeatureCategoryTelemetry    FeatureCategory = "telemetry"
	FeatureCategoryAdvanced     FeatureCategory = "advanced"
)

// FeatureType indicates whether the feature is controlled via an environment
// variable or a settings file key.
type FeatureType string

// Feature type constants indicating whether the feature is controlled via env var or settings key.
const (
	FeatureTypeEnv     FeatureType = "env"
	FeatureTypeSetting FeatureType = "setting"
)

// Feature describes a single manageable feature flag or setting.
// ID is the unique identifier (the raw key used in env or settings).
// KeyPath is the dot-separated JSON path used with GetAtPath/SetAtPath.
// For env features this is the same as ID; for settings it may use dot
// notation for nested keys (e.g. "sandbox.enabled").
type Feature struct {
	ID           string
	KeyPath      string
	Label        string
	Description  string
	Category     FeatureCategory
	Type         FeatureType
	ValueType    string // "boolean", "string", "number"
	DefaultValue string // empty string means no default
	Options      []string
}

// allFeatures is the authoritative list of features ported from
// src/server/lib/feature-registry.ts.
var allFeatures = []Feature{
	// --- Experimental ---
	{
		ID:          "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS",
		KeyPath:     "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS",
		Label:       "Agent Teams",
		Description: "Multi-agent collaboration where one session coordinates teammate sessions.",
		Category:    FeatureCategoryExperimental,
		Type:        FeatureTypeEnv,
		ValueType:   "boolean",
	},
	{
		ID:          "CLAUDE_CODE_DISABLE_AUTO_MEMORY",
		KeyPath:     "CLAUDE_CODE_DISABLE_AUTO_MEMORY",
		Label:       "Disable Auto Memory",
		Description: "Disable automatic memory recording and recall across sessions.",
		Category:    FeatureCategoryExperimental,
		Type:        FeatureTypeEnv,
		ValueType:   "boolean",
	},
	{
		ID:          "CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS",
		KeyPath:     "CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS",
		Label:       "Disable Experimental Betas",
		Description: "Disable Anthropic API beta headers. Useful for Bedrock/Vertex gateways.",
		Category:    FeatureCategoryExperimental,
		Type:        FeatureTypeEnv,
		ValueType:   "boolean",
	},

	// --- Model ---
	{
		ID:          "alwaysThinkingEnabled",
		KeyPath:     "alwaysThinkingEnabled",
		Label:       "Always Enable Thinking",
		Description: "Enable extended thinking by default for all sessions.",
		Category:    FeatureCategoryModel,
		Type:        FeatureTypeSetting,
		ValueType:   "boolean",
	},
	{
		ID:           "CLAUDE_CODE_EFFORT_LEVEL",
		KeyPath:      "CLAUDE_CODE_EFFORT_LEVEL",
		Label:        "Effort Level",
		Description:  "Controls effort level for supported models.",
		Category:     FeatureCategoryModel,
		Type:         FeatureTypeEnv,
		ValueType:    "string",
		DefaultValue: "high",
		Options:      []string{"low", "medium", "high"},
	},
	{
		ID:           "CLAUDE_CODE_MAX_OUTPUT_TOKENS",
		KeyPath:      "CLAUDE_CODE_MAX_OUTPUT_TOKENS",
		Label:        "Max Output Tokens",
		Description:  "Maximum output tokens per response (up to 64000).",
		Category:     FeatureCategoryModel,
		Type:         FeatureTypeEnv,
		ValueType:    "number",
		DefaultValue: "32000",
	},
	{
		ID:           "MAX_THINKING_TOKENS",
		KeyPath:      "MAX_THINKING_TOKENS",
		Label:        "Max Thinking Tokens",
		Description:  "Override the extended thinking token budget.",
		Category:     FeatureCategoryModel,
		Type:         FeatureTypeEnv,
		ValueType:    "number",
		DefaultValue: "31999",
	},
	{
		ID:          "DISABLE_PROMPT_CACHING",
		KeyPath:     "DISABLE_PROMPT_CACHING",
		Label:       "Disable Prompt Caching",
		Description: "Disable prompt caching optimization globally.",
		Category:    FeatureCategoryModel,
		Type:        FeatureTypeEnv,
		ValueType:   "boolean",
	},
	{
		ID:          "DISABLE_PROMPT_CACHING_HAIKU",
		KeyPath:     "DISABLE_PROMPT_CACHING_HAIKU",
		Label:       "Disable Prompt Caching (Haiku)",
		Description: "Disable prompt caching for Haiku models only.",
		Category:    FeatureCategoryModel,
		Type:        FeatureTypeEnv,
		ValueType:   "boolean",
	},
	{
		ID:          "DISABLE_PROMPT_CACHING_SONNET",
		KeyPath:     "DISABLE_PROMPT_CACHING_SONNET",
		Label:       "Disable Prompt Caching (Sonnet)",
		Description: "Disable prompt caching for Sonnet models only.",
		Category:    FeatureCategoryModel,
		Type:        FeatureTypeEnv,
		ValueType:   "boolean",
	},
	{
		ID:          "DISABLE_PROMPT_CACHING_OPUS",
		KeyPath:     "DISABLE_PROMPT_CACHING_OPUS",
		Label:       "Disable Prompt Caching (Opus)",
		Description: "Disable prompt caching for Opus models only.",
		Category:    FeatureCategoryModel,
		Type:        FeatureTypeEnv,
		ValueType:   "boolean",
	},
	{
		ID:          "CLAUDE_CODE_SUBAGENT_MODEL",
		KeyPath:     "CLAUDE_CODE_SUBAGENT_MODEL",
		Label:       "Subagent Model",
		Description: "Override the model used for subagent tasks.",
		Category:    FeatureCategoryModel,
		Type:        FeatureTypeEnv,
		ValueType:   "string",
	},
	{
		ID:          "CLAUDE_CODE_DISABLE_THINKING",
		KeyPath:     "CLAUDE_CODE_DISABLE_THINKING",
		Label:       "Disable Thinking",
		Description: "Disable extended thinking entirely.",
		Category:    FeatureCategoryModel,
		Type:        FeatureTypeEnv,
		ValueType:   "boolean",
	},
	{
		ID:          "CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING",
		KeyPath:     "CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING",
		Label:       "Disable Adaptive Thinking",
		Description: "Disable adaptive thinking token allocation.",
		Category:    FeatureCategoryModel,
		Type:        FeatureTypeEnv,
		ValueType:   "boolean",
	},
	{
		ID:          "DISABLE_NON_ESSENTIAL_MODEL_CALLS",
		KeyPath:     "DISABLE_NON_ESSENTIAL_MODEL_CALLS",
		Label:       "Disable Non-Essential Model Calls",
		Description: "Disable model calls for non-critical paths like flavor text and tips.",
		Category:    FeatureCategoryModel,
		Type:        FeatureTypeEnv,
		ValueType:   "boolean",
	},

	// --- UI ---
	{
		ID:           "spinnerTipsEnabled",
		KeyPath:      "spinnerTipsEnabled",
		Label:        "Spinner Tips",
		Description:  "Show tips in the spinner while Claude is working.",
		Category:     FeatureCategoryUI,
		Type:         FeatureTypeSetting,
		ValueType:    "boolean",
		DefaultValue: "true",
	},
	{
		ID:           "terminalProgressBarEnabled",
		KeyPath:      "terminalProgressBarEnabled",
		Label:        "Terminal Progress Bar",
		Description:  "Enable the terminal progress bar (iTerm2, Windows Terminal).",
		Category:     FeatureCategoryUI,
		Type:         FeatureTypeSetting,
		ValueType:    "boolean",
		DefaultValue: "true",
	},
	{
		ID:          "prefersReducedMotion",
		KeyPath:     "prefersReducedMotion",
		Label:       "Reduced Motion",
		Description: "Reduce or disable UI animations for accessibility.",
		Category:    FeatureCategoryUI,
		Type:        FeatureTypeSetting,
		ValueType:   "boolean",
	},
	{
		ID:           "showTurnDuration",
		KeyPath:      "showTurnDuration",
		Label:        "Show Turn Duration",
		Description:  "Show turn duration timing after responses.",
		Category:     FeatureCategoryUI,
		Type:         FeatureTypeSetting,
		ValueType:    "boolean",
		DefaultValue: "true",
	},
	{
		ID:           "CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION",
		KeyPath:      "CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION",
		Label:        "Prompt Suggestions",
		Description:  "Enable grayed-out inline prompt suggestions.",
		Category:     FeatureCategoryUI,
		Type:         FeatureTypeEnv,
		ValueType:    "boolean",
		DefaultValue: "true",
	},
	{
		ID:          "CLAUDE_CODE_DISABLE_FAST_MODE",
		KeyPath:     "CLAUDE_CODE_DISABLE_FAST_MODE",
		Label:       "Disable Fast Mode",
		Description: "Disable the fast output mode toggle.",
		Category:    FeatureCategoryUI,
		Type:        FeatureTypeEnv,
		ValueType:   "boolean",
	},
	{
		ID:          "DISABLE_COST_WARNINGS",
		KeyPath:     "DISABLE_COST_WARNINGS",
		Label:       "Disable Cost Warnings",
		Description: "Suppress token usage cost warning messages.",
		Category:    FeatureCategoryUI,
		Type:        FeatureTypeEnv,
		ValueType:   "boolean",
	},
	{
		ID:          "CLAUDE_CODE_DISABLE_TERMINAL_TITLE",
		KeyPath:     "CLAUDE_CODE_DISABLE_TERMINAL_TITLE",
		Label:       "Disable Terminal Title",
		Description: "Prevent Claude Code from updating the terminal window title.",
		Category:    FeatureCategoryUI,
		Type:        FeatureTypeEnv,
		ValueType:   "boolean",
	},
	{
		ID:          "CLAUDE_CODE_HIDE_ACCOUNT_INFO",
		KeyPath:     "CLAUDE_CODE_HIDE_ACCOUNT_INFO",
		Label:       "Hide Account Info",
		Description: "Hide email and organization info from the UI.",
		Category:    FeatureCategoryUI,
		Type:        FeatureTypeEnv,
		ValueType:   "boolean",
	},
	{
		ID:           "teammateMode",
		KeyPath:      "teammateMode",
		Label:        "Teammate Mode",
		Description:  "Agent teams display mode.",
		Category:     FeatureCategoryUI,
		Type:         FeatureTypeSetting,
		ValueType:    "string",
		DefaultValue: "auto",
		Options:      []string{"auto", "in-process", "tmux"},
	},

	// --- Security ---
	{
		ID:          "skipDangerousModePermissionPrompt",
		KeyPath:     "skipDangerousModePermissionPrompt",
		Label:       "Skip Dangerous Mode Prompt",
		Description: "Skip the confirmation prompt when entering dangerous mode.",
		Category:    FeatureCategorySecurity,
		Type:        FeatureTypeSetting,
		ValueType:   "boolean",
	},
	{
		ID:          "sandbox.enabled",
		KeyPath:     "sandbox.enabled",
		Label:       "Sandbox",
		Description: "Enable bash sandboxing (macOS seatbelt, Linux bubblewrap).",
		Category:    FeatureCategorySecurity,
		Type:        FeatureTypeSetting,
		ValueType:   "boolean",
	},
	{
		ID:          "CLAUDE_CODE_DISABLE_COMMAND_INJECTION_CHECK",
		KeyPath:     "CLAUDE_CODE_DISABLE_COMMAND_INJECTION_CHECK",
		Label:       "Disable Command Injection Check",
		Description: "Disable the command injection safety check.",
		Category:    FeatureCategorySecurity,
		Type:        FeatureTypeEnv,
		ValueType:   "boolean",
	},
	{
		ID:          "enableAllProjectMcpServers",
		KeyPath:     "enableAllProjectMcpServers",
		Label:       "Auto-Approve Project MCP Servers",
		Description: "Auto-approve all MCP servers from project .mcp.json files.",
		Category:    FeatureCategorySecurity,
		Type:        FeatureTypeSetting,
		ValueType:   "boolean",
	},
	{
		ID:          "disableAllHooks",
		KeyPath:     "disableAllHooks",
		Label:       "Disable All Hooks",
		Description: "Disable all hooks and custom status line.",
		Category:    FeatureCategorySecurity,
		Type:        FeatureTypeSetting,
		ValueType:   "boolean",
	},

	// --- Telemetry ---
	{
		ID:          "DISABLE_TELEMETRY",
		KeyPath:     "DISABLE_TELEMETRY",
		Label:       "Disable Telemetry",
		Description: "Opt out of Statsig usage telemetry.",
		Category:    FeatureCategoryTelemetry,
		Type:        FeatureTypeEnv,
		ValueType:   "boolean",
	},
	{
		ID:          "DISABLE_ERROR_REPORTING",
		KeyPath:     "DISABLE_ERROR_REPORTING",
		Label:       "Disable Error Reporting",
		Description: "Disable Sentry crash reporting.",
		Category:    FeatureCategoryTelemetry,
		Type:        FeatureTypeEnv,
		ValueType:   "boolean",
	},
	{
		ID:          "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
		KeyPath:     "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
		Label:       "Disable Nonessential Traffic",
		Description: "Disable autoupdater, bug reporting, error reporting, and telemetry.",
		Category:    FeatureCategoryTelemetry,
		Type:        FeatureTypeEnv,
		ValueType:   "boolean",
	},
	{
		ID:          "CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY",
		KeyPath:     "CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY",
		Label:       "Disable Feedback Survey",
		Description: "Disable session quality surveys.",
		Category:    FeatureCategoryTelemetry,
		Type:        FeatureTypeEnv,
		ValueType:   "boolean",
	},

	// --- Advanced ---
	{
		ID:          "CLAUDE_CODE_DISABLE_BACKGROUND_TASKS",
		KeyPath:     "CLAUDE_CODE_DISABLE_BACKGROUND_TASKS",
		Label:       "Disable Background Tasks",
		Description: "Disable all background task functionality and Ctrl+B shortcut.",
		Category:    FeatureCategoryAdvanced,
		Type:        FeatureTypeEnv,
		ValueType:   "boolean",
	},
	{
		ID:           "CLAUDE_CODE_ENABLE_TASKS",
		KeyPath:      "CLAUDE_CODE_ENABLE_TASKS",
		Label:        "Enable Task System",
		Description:  "Toggle between the new task tracking system and the legacy TODO list.",
		Category:     FeatureCategoryAdvanced,
		Type:         FeatureTypeEnv,
		ValueType:    "boolean",
		DefaultValue: "true",
	},
	{
		ID:          "CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING",
		KeyPath:     "CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING",
		Label:       "Disable File Checkpointing",
		Description: "Disable automatic file checkpointing.",
		Category:    FeatureCategoryAdvanced,
		Type:        FeatureTypeEnv,
		ValueType:   "boolean",
	},
	{
		ID:          "DISABLE_AUTO_COMPACT",
		KeyPath:     "DISABLE_AUTO_COMPACT",
		Label:       "Disable Auto-Compact",
		Description: "Disable automatic context compaction.",
		Category:    FeatureCategoryAdvanced,
		Type:        FeatureTypeEnv,
		ValueType:   "boolean",
	},
	{
		ID:          "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE",
		KeyPath:     "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE",
		Label:       "Auto-Compact Threshold",
		Description: "Context capacity percentage at which auto-compaction triggers (1-100).",
		Category:    FeatureCategoryAdvanced,
		Type:        FeatureTypeEnv,
		ValueType:   "number",
	},
	{
		ID:           "respectGitignore",
		KeyPath:      "respectGitignore",
		Label:        "Respect Gitignore",
		Description:  "Whether the @ file picker respects .gitignore.",
		Category:     FeatureCategoryAdvanced,
		Type:         FeatureTypeSetting,
		ValueType:    "boolean",
		DefaultValue: "true",
	},
	{
		ID:           "autoUpdatesChannel",
		KeyPath:      "autoUpdatesChannel",
		Label:        "Auto-Updates Channel",
		Description:  "Release channel for automatic updates.",
		Category:     FeatureCategoryAdvanced,
		Type:         FeatureTypeSetting,
		ValueType:    "string",
		DefaultValue: "latest",
		Options:      []string{"stable", "latest"},
	},
	{
		ID:          "DISABLE_AUTOUPDATER",
		KeyPath:     "DISABLE_AUTOUPDATER",
		Label:       "Disable Auto-Updater",
		Description: "Prevent automatic background updates.",
		Category:    FeatureCategoryAdvanced,
		Type:        FeatureTypeEnv,
		ValueType:   "boolean",
	},
	{
		ID:           "ENABLE_TOOL_SEARCH",
		KeyPath:      "ENABLE_TOOL_SEARCH",
		Label:        "MCP Tool Search",
		Description:  "Controls MCP tool search scaling behavior.",
		Category:     FeatureCategoryAdvanced,
		Type:         FeatureTypeEnv,
		ValueType:    "string",
		DefaultValue: "auto",
		Options:      []string{"auto", "true", "false"},
	},
}

// AllFeatures returns the complete static list of feature definitions.
// This is the source of truth for all manageable settings in the UI.
func AllFeatures() []Feature {
	result := make([]Feature, len(allFeatures))
	copy(result, allFeatures)
	return result
}

// GetFeature returns a feature by ID. Returns the zero value and false if not found.
func GetFeature(id string) (Feature, bool) {
	for _, f := range allFeatures {
		if f.ID == id {
			return f, true
		}
	}
	return Feature{}, false
}
