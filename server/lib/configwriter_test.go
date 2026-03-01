package lib_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"fieldstation/lib"
)

// --- ReadJSONFileSafe ---

func TestReadJSONFileSafe_ExistingFile(t *testing.T) {
	dir := t.TempDir()
	filePath := filepath.Join(dir, "settings.json")
	require.NoError(t, os.WriteFile(filePath, []byte(`{"key":"val"}`), 0o600))

	obj := lib.ReadJSONFileSafe(filePath)
	assert.Equal(t, "val", obj["key"])
}

func TestReadJSONFileSafe_MissingFile(t *testing.T) {
	dir := t.TempDir()
	obj := lib.ReadJSONFileSafe(filepath.Join(dir, "nope.json"))
	assert.Equal(t, lib.JsonObject{}, obj)
}

func TestReadJSONFileSafe_InvalidJSON(t *testing.T) {
	dir := t.TempDir()
	filePath := filepath.Join(dir, "bad.json")
	require.NoError(t, os.WriteFile(filePath, []byte("not json"), 0o600))

	obj := lib.ReadJSONFileSafe(filePath)
	assert.Equal(t, lib.JsonObject{}, obj)
}

// --- WriteJSONFileSafe ---

func TestWriteJSONFileSafe_WritesFile(t *testing.T) {
	dir := t.TempDir()
	filePath := filepath.Join(dir, "out.json")
	require.NoError(t, lib.WriteJSONFileSafe(filePath, lib.JsonObject{"x": 1}))

	data, err := os.ReadFile(filePath) //nolint:gosec // filePath is a controlled temp file
	require.NoError(t, err)
	assert.Contains(t, string(data), `"x"`)
	// Should end with newline
	assert.Equal(t, byte('\n'), data[len(data)-1])
}

func TestWriteJSONFileSafe_CreatesParentDirs(t *testing.T) {
	parent := t.TempDir()
	filePath := filepath.Join(parent, "sub", "dir", "out.json")
	require.NoError(t, lib.WriteJSONFileSafe(filePath, lib.JsonObject{"ok": true}))
	assert.FileExists(t, filePath)
}

// --- ResolveLayerPath ---

func TestResolveLayerPath_Global(t *testing.T) {
	claudeHome := t.TempDir()
	t.Setenv("CLAUDE_HOME", claudeHome)

	path, err := lib.ResolveLayerPath(lib.ConfigLayerGlobal, "")
	require.NoError(t, err)
	assert.Equal(t, filepath.Join(claudeHome, "settings.json"), path)
}

func TestResolveLayerPath_GlobalLocal(t *testing.T) {
	claudeHome := t.TempDir()
	t.Setenv("CLAUDE_HOME", claudeHome)

	path, err := lib.ResolveLayerPath(lib.ConfigLayerGlobalLocal, "")
	require.NoError(t, err)
	assert.Equal(t, filepath.Join(claudeHome, "settings.local.json"), path)
}

func TestResolveLayerPath_Project(t *testing.T) {
	projectDir := t.TempDir()
	path, err := lib.ResolveLayerPath(lib.ConfigLayerProject, projectDir)
	require.NoError(t, err)
	assert.Equal(t, filepath.Join(projectDir, ".claude", "settings.json"), path)
}

func TestResolveLayerPath_ProjectLocal(t *testing.T) {
	projectDir := t.TempDir()
	path, err := lib.ResolveLayerPath(lib.ConfigLayerProjectLocal, projectDir)
	require.NoError(t, err)
	assert.Equal(t, filepath.Join(projectDir, ".claude", "settings.local.json"), path)
}

func TestResolveLayerPath_ProjectMissingPath(t *testing.T) {
	_, err := lib.ResolveLayerPath(lib.ConfigLayerProject, "")
	assert.Error(t, err)
}

func TestResolveLayerPath_ProjectLocalMissingPath(t *testing.T) {
	_, err := lib.ResolveLayerPath(lib.ConfigLayerProjectLocal, "")
	assert.Error(t, err)
}

// --- ApplyUpdateSetting ---

func TestApplyUpdateSetting_UpdatesKey(t *testing.T) {
	claudeHome := t.TempDir()
	dir := t.TempDir()
	filePath := filepath.Join(dir, "settings.json")
	require.NoError(t, os.WriteFile(filePath, []byte(`{"theme":"light"}`), 0o600))

	require.NoError(t, lib.ApplyUpdateSetting(filePath, "theme", "dark", claudeHome))

	obj := lib.ReadJSONFileSafe(filePath)
	assert.Equal(t, "dark", obj["theme"])
}

func TestApplyUpdateSetting_CreatesNestedKey(t *testing.T) {
	claudeHome := t.TempDir()
	dir := t.TempDir()
	filePath := filepath.Join(dir, "settings.json")
	require.NoError(t, os.WriteFile(filePath, []byte(`{}`), 0o600))

	require.NoError(t, lib.ApplyUpdateSetting(filePath, "a.b.c", 42, claudeHome))

	obj := lib.ReadJSONFileSafe(filePath)
	a, ok := obj["a"].(lib.JsonObject)
	require.True(t, ok)
	b, ok := a["b"].(lib.JsonObject)
	require.True(t, ok)
	assert.EqualValues(t, 42, b["c"])
}

func TestApplyUpdateSetting_CreatesBackup(t *testing.T) {
	claudeHome := t.TempDir()
	dir := t.TempDir()
	filePath := filepath.Join(dir, "settings.json")
	require.NoError(t, os.WriteFile(filePath, []byte(`{"k":"v"}`), 0o600))

	require.NoError(t, lib.ApplyUpdateSetting(filePath, "k", "new", claudeHome))

	entries := lib.ListBackups(claudeHome)
	assert.NotEmpty(t, entries)
}

// --- ApplyDeleteSetting ---

func TestApplyDeleteSetting_RemovesKey(t *testing.T) {
	claudeHome := t.TempDir()
	dir := t.TempDir()
	filePath := filepath.Join(dir, "settings.json")
	require.NoError(t, os.WriteFile(filePath, []byte(`{"a":1,"b":2}`), 0o600))

	require.NoError(t, lib.ApplyDeleteSetting(filePath, "a", claudeHome))

	obj := lib.ReadJSONFileSafe(filePath)
	_, hasA := obj["a"]
	assert.False(t, hasA)
	assert.EqualValues(t, 2, obj["b"])
}

func TestApplyDeleteSetting_ErrorIfFileNotExists(t *testing.T) {
	claudeHome := t.TempDir()
	err := lib.ApplyDeleteSetting("/nonexistent/settings.json", "key", claudeHome)
	assert.Error(t, err)
}

// --- ApplyMoveSetting ---

func TestApplyMoveSetting_MovesKey(t *testing.T) {
	claudeHome := t.TempDir()
	dir := t.TempDir()

	fromPath := filepath.Join(dir, "from.json")
	toPath := filepath.Join(dir, "to.json")

	require.NoError(t, os.WriteFile(fromPath, []byte(`{"theme":"dark","other":"keep"}`), 0o600))
	require.NoError(t, os.WriteFile(toPath, []byte(`{"existing":true}`), 0o600))

	require.NoError(t, lib.ApplyMoveSetting(fromPath, toPath, "theme", claudeHome))

	fromObj := lib.ReadJSONFileSafe(fromPath)
	_, hasTheme := fromObj["theme"]
	assert.False(t, hasTheme, "key should be removed from source")
	assert.Equal(t, "keep", fromObj["other"])

	toObj := lib.ReadJSONFileSafe(toPath)
	assert.Equal(t, "dark", toObj["theme"])
	assert.Equal(t, true, toObj["existing"])
}

func TestApplyMoveSetting_ErrorIfKeyNotFound(t *testing.T) {
	claudeHome := t.TempDir()
	dir := t.TempDir()

	fromPath := filepath.Join(dir, "from.json")
	toPath := filepath.Join(dir, "to.json")
	require.NoError(t, os.WriteFile(fromPath, []byte(`{}`), 0o600))
	require.NoError(t, os.WriteFile(toPath, []byte(`{}`), 0o600))

	err := lib.ApplyMoveSetting(fromPath, toPath, "missing", claudeHome)
	assert.Error(t, err)
}
