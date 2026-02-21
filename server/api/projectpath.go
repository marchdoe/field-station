package api

import (
	"fmt"
	"os"
	"path/filepath"

	"fieldstation/lib"
)

// resolveProjectPath validates that projectId corresponds to a registered
// project in claudeHome/projects/ and returns the decoded filesystem path.
//
// This replaces the GetAllowedRoots + AssertSafePath pattern in handlers:
// a project path is safe if and only if its encoded directory exists under
// ~/.claude/projects/, which is how Claude Code registers projects.
func resolveProjectPath(claudeHome, projectId string) (string, error) {
	if projectId == "" {
		return "", fmt.Errorf("projectId is required")
	}
	projectDir := filepath.Join(claudeHome, "projects", projectId)
	if _, err := os.Stat(projectDir); err != nil {
		return "", fmt.Errorf("unregistered project id %q: %w", projectId, err)
	}
	return lib.DecodePath(projectId)
}
