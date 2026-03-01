package lib_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"fieldstation/lib"
)

func TestGetConfigLayer_ExistingFile(t *testing.T) {
	dir := t.TempDir()
	filePath := filepath.Join(dir, "settings.json")
	require.NoError(t, os.WriteFile(filePath, []byte(`{"key":"value"}`), 0o600))

	layer := lib.GetConfigLayer(filePath, lib.ConfigLayerGlobal)
	assert.True(t, layer.Exists)
	assert.Equal(t, lib.ConfigLayerGlobal, layer.Source)
	assert.Equal(t, filePath, layer.FilePath)
	assert.Equal(t, lib.JsonObject{"key": "value"}, layer.Content)
}

func TestGetConfigLayer_MissingFile(t *testing.T) {
	dir := t.TempDir()
	filePath := filepath.Join(dir, "nope.json")

	layer := lib.GetConfigLayer(filePath, lib.ConfigLayerGlobal)
	assert.False(t, layer.Exists)
	assert.Nil(t, layer.Content)
}

func TestGetConfigLayer_InvalidJSON(t *testing.T) {
	dir := t.TempDir()
	filePath := filepath.Join(dir, "bad.json")
	require.NoError(t, os.WriteFile(filePath, []byte("not json{{{"), 0o600))

	layer := lib.GetConfigLayer(filePath, lib.ConfigLayerProject)
	assert.True(t, layer.Exists)
	assert.Nil(t, layer.Content)
}

func TestMergeConfigLayers_EmptyNoFiles(t *testing.T) {
	claudeHome := t.TempDir()
	t.Setenv("CLAUDE_HOME", claudeHome)

	result := lib.MergeConfigLayers("")
	assert.Equal(t, lib.JsonObject{}, result.Merged)
	assert.Len(t, result.Layers, 2)
}

func TestMergeConfigLayers_GlobalSettings(t *testing.T) {
	claudeHome := t.TempDir()
	t.Setenv("CLAUDE_HOME", claudeHome)

	require.NoError(t, os.WriteFile(
		filepath.Join(claudeHome, "settings.json"),
		[]byte(`{"theme":"dark"}`),
		0o600,
	))

	result := lib.MergeConfigLayers("")
	assert.Equal(t, "dark", result.Merged["theme"])
}

func TestMergeConfigLayers_DeepMerge(t *testing.T) {
	claudeHome := t.TempDir()
	t.Setenv("CLAUDE_HOME", claudeHome)

	require.NoError(t, os.WriteFile(
		filepath.Join(claudeHome, "settings.json"),
		[]byte(`{"a":{"x":1,"y":2},"b":"hello"}`),
		0o600,
	))
	require.NoError(t, os.WriteFile(
		filepath.Join(claudeHome, "settings.local.json"),
		[]byte(`{"a":{"y":99,"z":3},"c":true}`),
		0o600,
	))

	result := lib.MergeConfigLayers("")
	a, ok := result.Merged["a"].(lib.JsonObject)
	require.True(t, ok)
	// x preserved, y overridden by local, z added from local
	assert.EqualValues(t, 1, a["x"])
	assert.EqualValues(t, 99, a["y"])
	assert.EqualValues(t, 3, a["z"])
	assert.Equal(t, "hello", result.Merged["b"])
	assert.Equal(t, true, result.Merged["c"])
}

func TestMergeConfigLayers_ProjectLayers(t *testing.T) {
	claudeHome := t.TempDir()
	t.Setenv("CLAUDE_HOME", claudeHome)

	projectDir := t.TempDir()
	claudeDir := filepath.Join(projectDir, ".claude")
	require.NoError(t, os.MkdirAll(claudeDir, 0o750))

	require.NoError(t, os.WriteFile(
		filepath.Join(claudeHome, "settings.json"),
		[]byte(`{"global":true}`),
		0o600,
	))
	require.NoError(t, os.WriteFile(
		filepath.Join(claudeDir, "settings.json"),
		[]byte(`{"project":true}`),
		0o600,
	))

	result := lib.MergeConfigLayers(projectDir)
	assert.Len(t, result.Layers, 4)
	assert.Equal(t, true, result.Merged["global"])
	assert.Equal(t, true, result.Merged["project"])
}

func TestMergeConfigLayers_LaterLayersOverride(t *testing.T) {
	claudeHome := t.TempDir()
	t.Setenv("CLAUDE_HOME", claudeHome)

	projectDir := t.TempDir()
	claudeDir := filepath.Join(projectDir, ".claude")
	require.NoError(t, os.MkdirAll(claudeDir, 0o750))

	require.NoError(t, os.WriteFile(
		filepath.Join(claudeHome, "settings.json"),
		[]byte(`{"mode":"global"}`),
		0o600,
	))
	require.NoError(t, os.WriteFile(
		filepath.Join(claudeDir, "settings.json"),
		[]byte(`{"mode":"project"}`),
		0o600,
	))

	result := lib.MergeConfigLayers(projectDir)
	assert.Equal(t, "project", result.Merged["mode"])
}

func TestMergeConfigLayers_ArraysReplaced(t *testing.T) {
	claudeHome := t.TempDir()
	t.Setenv("CLAUDE_HOME", claudeHome)

	require.NoError(t, os.WriteFile(
		filepath.Join(claudeHome, "settings.json"),
		[]byte(`{"items":[1,2]}`),
		0o600,
	))
	require.NoError(t, os.WriteFile(
		filepath.Join(claudeHome, "settings.local.json"),
		[]byte(`{"items":[3]}`),
		0o600,
	))

	result := lib.MergeConfigLayers("")
	assert.Equal(t, []any{float64(3)}, result.Merged["items"])
}
