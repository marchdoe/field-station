package lib_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"fieldstation/lib"
)

func TestAssertSafePath_Allowed(t *testing.T) {
	home := t.TempDir()
	allowed := []string{home}
	got, err := lib.AssertSafePath(filepath.Join(home, "file.txt"), allowed)
	require.NoError(t, err)
	assert.Equal(t, filepath.Join(home, "file.txt"), got)
}

func TestAssertSafePath_ExactRoot(t *testing.T) {
	home := t.TempDir()
	allowed := []string{home}
	got, err := lib.AssertSafePath(home, allowed)
	require.NoError(t, err)
	assert.Equal(t, home, got)
}

func TestAssertSafePath_Disallowed(t *testing.T) {
	home := t.TempDir()
	other := t.TempDir()
	allowed := []string{home}
	_, err := lib.AssertSafePath(filepath.Join(other, "evil.txt"), allowed)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "outside allowed")
}

func TestAssertSafePath_Empty(t *testing.T) {
	_, err := lib.AssertSafePath("", []string{"/tmp"})
	assert.Error(t, err)
}

func TestAssertSafePath_TraversalAttempt(t *testing.T) {
	home := t.TempDir()
	allowed := []string{home}
	// Attempt to escape via ..
	_, err := lib.AssertSafePath(filepath.Join(home, "..", "etc", "passwd"), allowed)
	assert.Error(t, err)
}

func TestEncodePath_Simple(t *testing.T) {
	assert.Equal(t, "-Users-foo-bar", lib.EncodePath("/Users/foo/bar"))
}

func TestEncodePath_Roundtrip(t *testing.T) {
	original := "/Users/dougmarch/Projects/myapp"
	encoded := lib.EncodePath(original)
	decoded, err := lib.DecodePath(encoded)
	require.NoError(t, err)
	assert.Equal(t, original, decoded)
}

func TestDecodePath_Simple(t *testing.T) {
	// -Users-foo-bar -> /Users/foo/bar
	got, err := lib.DecodePath("-Users-foo-bar")
	require.NoError(t, err)
	assert.Equal(t, "/Users/foo/bar", got)
}

func TestDecodePath_NoDashPrefix(t *testing.T) {
	// Without leading dash, treat entire string as path components
	got, err := lib.DecodePath("home-user-projects")
	require.NoError(t, err)
	assert.Equal(t, "/home/user/projects", got)
}

func TestGetAllowedRoots_IncludesClaudeHome(t *testing.T) {
	claudeHome := t.TempDir()
	t.Setenv("CLAUDE_HOME", claudeHome)
	roots := lib.GetAllowedRoots("/nonexistent/data.json")
	absHome, _ := filepath.Abs(claudeHome)
	assert.Contains(t, roots, absHome)
}

func TestGetAllowedRoots_IncludesDataFilePaths(t *testing.T) {
	claudeHome := t.TempDir()
	t.Setenv("CLAUDE_HOME", claudeHome)

	dataFile := filepath.Join(claudeHome, "projects.json")
	projectPath := t.TempDir()
	require.NoError(t, os.WriteFile(dataFile, []byte(`["`+projectPath+`"]`), 0o644))

	roots := lib.GetAllowedRoots(dataFile)
	absProject, _ := filepath.Abs(projectPath)
	assert.Contains(t, roots, absProject)
}

func TestGetAllowedRoots_IncludesProjectsDir(t *testing.T) {
	claudeHome := t.TempDir()
	t.Setenv("CLAUDE_HOME", claudeHome)

	// Create a project dir entry: -tmp-myproject encodes /tmp/myproject
	projectsDir := filepath.Join(claudeHome, "projects")
	require.NoError(t, os.MkdirAll(filepath.Join(projectsDir, "-tmp-myproject"), 0o755))

	roots := lib.GetAllowedRoots("/nonexistent/data.json")
	assert.Contains(t, roots, "/tmp/myproject")
}
