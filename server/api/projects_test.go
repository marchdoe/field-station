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

func TestGetProjects_ExcludesAncestorPaths(t *testing.T) {
	h, claudeHome := newTestHandler(t)

	projectsDir := filepath.Join(claudeHome, "projects")
	require.NoError(t, os.MkdirAll(projectsDir, 0o755))

	// Register parent and two children using the same helper from test suite
	parent := t.TempDir()
	app := filepath.Join(parent, "app")
	apiDir := filepath.Join(parent, "api")
	require.NoError(t, os.MkdirAll(app, 0o755))
	require.NoError(t, os.MkdirAll(apiDir, 0o755))

	for _, p := range []string{parent, app, apiDir} {
		registerProject(t, claudeHome, p)
	}

	resp, err := h.GetProjects(context.Background(), api.GetProjectsRequestObject{})
	require.NoError(t, err)

	projects, ok := resp.(api.GetProjects200JSONResponse)
	require.True(t, ok)

	// parent is an ancestor of app and apiDir — it must be excluded
	for _, p := range projects {
		assert.NotEqual(t, parent, p.Path, "ancestor path must be excluded from project list")
	}
	// app and apiDir must both appear
	paths := make([]string, len(projects))
	for i, p := range projects {
		paths[i] = p.Path
	}
	assert.Contains(t, paths, app, "child project 'app' must appear")
	assert.Contains(t, paths, apiDir, "child project 'api' must appear")
}

// --- ScanProjects tests ---

func TestScanProjects_FindsClaudeDirs(t *testing.T) {
	h, _ := newTestHandler(t)

	folder := t.TempDir()
	// Create 3 subdirs; 2 have .claude/
	for _, name := range []string{"proj-a", "proj-b", "no-claude"} {
		require.NoError(t, os.MkdirAll(filepath.Join(folder, name), 0o755))
	}
	require.NoError(t, os.MkdirAll(filepath.Join(folder, "proj-a", ".claude"), 0o755))
	require.NoError(t, os.MkdirAll(filepath.Join(folder, "proj-b", ".claude"), 0o755))

	resp, err := h.ScanProjects(context.Background(), api.ScanProjectsRequestObject{
		Params: api.ScanProjectsParams{Folder: folder},
	})
	require.NoError(t, err)

	results, ok := resp.(api.ScanProjects200JSONResponse)
	require.True(t, ok)
	assert.Len(t, results, 2)
}

func TestScanProjects_MarksRegisteredProjects(t *testing.T) {
	h, claudeHome := newTestHandler(t)

	folder := t.TempDir()
	projA := filepath.Join(folder, "proj-a")
	projB := filepath.Join(folder, "proj-b")
	for _, p := range []string{projA, projB} {
		require.NoError(t, os.MkdirAll(filepath.Join(p, ".claude"), 0o755))
	}
	// Register only proj-a
	registerProject(t, claudeHome, projA)

	resp, err := h.ScanProjects(context.Background(), api.ScanProjectsRequestObject{
		Params: api.ScanProjectsParams{Folder: folder},
	})
	require.NoError(t, err)

	results, ok := resp.(api.ScanProjects200JSONResponse)
	require.True(t, ok)
	require.Len(t, results, 2)

	byName := make(map[string]api.ScanProjectResult)
	for _, r := range results {
		byName[r.Name] = r
	}
	assert.True(t, byName["proj-a"].Registered, "proj-a should be registered")
	assert.False(t, byName["proj-b"].Registered, "proj-b should not be registered")
}

func TestScanProjects_RejectsNonexistentFolder(t *testing.T) {
	h, _ := newTestHandler(t)

	resp, err := h.ScanProjects(context.Background(), api.ScanProjectsRequestObject{
		Params: api.ScanProjectsParams{Folder: "/nonexistent/folder/xyz"},
	})
	require.NoError(t, err)
	_, is400 := resp.(api.ScanProjects400JSONResponse)
	assert.True(t, is400, "nonexistent folder should return 400")
}

func TestScanProjects_EmptyWhenNoneHaveClaudeDir(t *testing.T) {
	h, _ := newTestHandler(t)

	folder := t.TempDir()
	require.NoError(t, os.MkdirAll(filepath.Join(folder, "no-claude-here"), 0o755))

	resp, err := h.ScanProjects(context.Background(), api.ScanProjectsRequestObject{
		Params: api.ScanProjectsParams{Folder: folder},
	})
	require.NoError(t, err)

	results, ok := resp.(api.ScanProjects200JSONResponse)
	require.True(t, ok)
	assert.Empty(t, results)
}

// --- PostProjects tests ---

func TestPostProjects_BatchCreatesDirectories(t *testing.T) {
	h, claudeHome := newTestHandler(t)

	pathA := t.TempDir()
	pathB := t.TempDir()

	body := &api.AddProjectsRequest{Paths: []string{pathA, pathB}}
	resp, err := h.PostProjects(context.Background(), api.PostProjectsRequestObject{Body: body})
	require.NoError(t, err)

	results, ok := resp.(api.PostProjects200JSONResponse)
	require.True(t, ok)
	assert.Len(t, results, 2)

	// Verify directories were created in claudeHome/projects/
	projectsDir := filepath.Join(claudeHome, "projects")
	entries, err := os.ReadDir(projectsDir)
	require.NoError(t, err)
	assert.Len(t, entries, 2)
}

func TestPostProjects_Idempotent(t *testing.T) {
	h, claudeHome := newTestHandler(t)

	path := t.TempDir()
	body := &api.AddProjectsRequest{Paths: []string{path}}

	// Register twice
	for i := 0; i < 2; i++ {
		resp, err := h.PostProjects(context.Background(), api.PostProjectsRequestObject{Body: body})
		require.NoError(t, err)
		_, ok := resp.(api.PostProjects200JSONResponse)
		assert.True(t, ok, "should succeed on second registration")
	}

	// Only one directory should exist
	projectsDir := filepath.Join(claudeHome, "projects")
	entries, err := os.ReadDir(projectsDir)
	require.NoError(t, err)
	assert.Len(t, entries, 1)
}

func TestPostProjects_RejectsNonexistentPath(t *testing.T) {
	h, _ := newTestHandler(t)

	body := &api.AddProjectsRequest{Paths: []string{"/nonexistent/path/xyz"}}
	resp, err := h.PostProjects(context.Background(), api.PostProjectsRequestObject{Body: body})
	require.NoError(t, err)

	_, is400 := resp.(api.PostProjects400JSONResponse)
	assert.True(t, is400, "nonexistent path should return 400")
}
