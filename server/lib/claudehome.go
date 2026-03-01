package lib

import (
	"os"
	"path/filepath"
)

// ResolveClaudeHome returns the Claude home directory.
// Uses the CLAUDE_HOME environment variable if set and the path exists,
// otherwise returns ~/.claude.
func ResolveClaudeHome() string {
	if envHome := os.Getenv("CLAUDE_HOME"); envHome != "" {
		if _, err := os.Stat(envHome); err == nil { //nolint:gosec // CLAUDE_HOME is a trusted operator-set env var
			return envHome
		}
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return filepath.Join(os.TempDir(), ".claude")
	}
	return filepath.Join(home, ".claude")
}
