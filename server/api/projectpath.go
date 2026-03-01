package api //nolint:revive // "api" is a meaningful package name for this HTTP handler package

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
func resolveProjectPath(claudeHome, projectID string) (string, error) {
	if projectID == "" {
		return "", fmt.Errorf("projectId is required")
	}
	projectDir := filepath.Join(claudeHome, "projects", projectID)
	if _, err := os.Stat(projectDir); err != nil {
		return "", fmt.Errorf("unregistered project id %q: %w", projectID, err)
	}
	return lib.DecodePath(projectID)
}
