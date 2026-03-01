package api_test

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"fieldstation/api"
)

// Issue O: GetPlugins must return all metadata fields, not just name/path/isUserOwned

func TestGetPlugins_ReturnsFullMetadata(t *testing.T) {
	h, claudeHome := newTestHandler(t)

	pluginsDir := filepath.Join(claudeHome, "plugins")
	require.NoError(t, os.MkdirAll(pluginsDir, 0o750))

	// Write an installed_plugins.json with rich metadata
	installedJSON := map[string]interface{}{
		"version": 1,
		"plugins": map[string]interface{}{
			"my-plugin": []map[string]interface{}{
				{
					"scope":        "global",
					"installPath":  filepath.Join(pluginsDir, "cache", "my-plugin"),
					"version":      "1.2.3",
					"installedAt":  "2024-01-15T10:00:00Z",
					"lastUpdated":  "2024-02-01T12:00:00Z",
					"gitCommitSha": "abc123def456",
				},
			},
		},
	}
	data, err := json.Marshal(installedJSON)
	require.NoError(t, err)
	require.NoError(t, os.WriteFile(filepath.Join(pluginsDir, "installed_plugins.json"), data, 0o600))

	resp, err := h.GetPlugins(context.Background(), api.GetPluginsRequestObject{})
	require.NoError(t, err)

	plugins, ok := resp.(api.GetPlugins200JSONResponse)
	require.True(t, ok)
	require.Len(t, plugins, 1)

	p := plugins[0]
	assert.Equal(t, "my-plugin", p.Name)

	// These fields should be returned by the handler (issue O fix)
	scope, _ := p.Get("scope")
	assert.Equal(t, "global", scope, "scope field should be included in plugin response")

	version, _ := p.Get("version")
	assert.Equal(t, "1.2.3", version, "version field should be included in plugin response")

	installedAt, _ := p.Get("installedAt")
	assert.Equal(t, "2024-01-15T10:00:00Z", installedAt, "installedAt should be included")

	gitCommitSha, _ := p.Get("gitCommitSha")
	assert.Equal(t, "abc123def456", gitCommitSha, "gitCommitSha should be included")
}

func TestGetPlugins_EmptyWhenNoFile(t *testing.T) {
	h, _ := newTestHandler(t)

	resp, err := h.GetPlugins(context.Background(), api.GetPluginsRequestObject{})
	require.NoError(t, err)

	plugins, ok := resp.(api.GetPlugins200JSONResponse)
	require.True(t, ok)
	assert.Empty(t, plugins)
}
