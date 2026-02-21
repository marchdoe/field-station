package api_test

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"fieldstation/api"
)

// encodePath encodes a filesystem path to the Claude Code project directory name format.
// Mirrors lib.DecodePath in reverse: "/Users/foo/bar" → "-Users-foo-bar".
func encodePath(path string) string {
	// strip leading "/"
	stripped := strings.TrimPrefix(path, "/")
	// replace remaining "/" with "-"
	return "-" + strings.ReplaceAll(stripped, "/", "-")
}

// Issue J: GetProjects must exclude the user's home directory from results

func TestGetProjects_ExcludesHomeDirectory(t *testing.T) {
	h, claudeHome := newTestHandler(t)

	home, err := os.UserHomeDir()
	require.NoError(t, err)

	projectsDir := filepath.Join(claudeHome, "projects")
	require.NoError(t, os.MkdirAll(projectsDir, 0o755))

	// Create an entry that decodes to the home directory
	homeEncoded := encodePath(home)
	require.NoError(t, os.MkdirAll(filepath.Join(projectsDir, homeEncoded), 0o755))

	// Create a legitimate project entry
	legitimateProject := "/tmp/myproject"
	projectEncoded := encodePath(legitimateProject)
	require.NoError(t, os.MkdirAll(filepath.Join(projectsDir, projectEncoded), 0o755))

	resp, err := h.GetProjects(context.Background(), api.GetProjectsRequestObject{})
	require.NoError(t, err)

	projects, ok := resp.(api.GetProjects200JSONResponse)
	require.True(t, ok)

	// The home directory must not appear in the results
	for _, p := range projects {
		assert.NotEqual(t, home, p.Path, "home directory must be excluded from project list")
	}

	// The legitimate project must appear
	found := false
	for _, p := range projects {
		if p.Path == legitimateProject {
			found = true
		}
	}
	assert.True(t, found, "legitimate project should appear in results")
}

func TestGetProjects_EmptyWhenNoneRegistered(t *testing.T) {
	h, _ := newTestHandler(t)

	resp, err := h.GetProjects(context.Background(), api.GetProjectsRequestObject{})
	require.NoError(t, err)

	projects, ok := resp.(api.GetProjects200JSONResponse)
	require.True(t, ok)
	assert.Empty(t, projects)
}
