package lib

import (
	"path/filepath"
	"strings"
)

// IsUserOwned returns true if filePath is NOT inside ~/.claude/plugins/cache/.
// Files in the plugin cache are managed by Claude Code, not the user.
func IsUserOwned(filePath string) bool {
	resolved, err := filepath.Abs(filePath)
	if err != nil {
		return true
	}
	protectedDir, err := filepath.Abs(filepath.Join(ResolveClaudeHome(), "plugins", "cache"))
	if err != nil {
		return true
	}
	if resolved == protectedDir {
		return false
	}
	return !strings.HasPrefix(resolved, protectedDir+string(filepath.Separator))
}
