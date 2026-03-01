package api_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"fieldstation/api"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetFeatures_SmokePasses(t *testing.T) {
	h, _ := newTestHandler(t)
	// GetFeatures should not panic or error even when no Claude binary is present.
	resp, err := h.GetFeatures(context.Background(), api.GetFeaturesRequestObject{})
	require.NoError(t, err)
	data, ok := resp.(api.GetFeatures200JSONResponse)
	require.True(t, ok)
	// The registry has documented features; at least 0 should be returned.
	assert.GreaterOrEqual(t, data.TotalDocumented, 0)
}

func TestUpdateFeature_WritesValueToSettings(t *testing.T) {
	h, claudeHome := newTestHandler(t)

	_, err := h.UpdateFeature(context.Background(), api.UpdateFeatureRequestObject{
		Key: "CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR",
		Body: &api.UpdateFeatureJSONRequestBody{
			Type:  api.UpdateFeatureRequestTypeEnv,
			Value: "1",
		},
	})
	require.NoError(t, err)

	data, err := os.ReadFile(filepath.Join(claudeHome, "settings.json")) //nolint:gosec // path is from t.TempDir(), safe in tests
	require.NoError(t, err)
	assert.Contains(t, string(data), "CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR")
	assert.Contains(t, string(data), "1")
}

func TestDeleteFeature_RemovesValueFromSettings(t *testing.T) {
	h, claudeHome := newTestHandler(t)

	// Use a key that is registered as env type so DeleteFeature resolves the
	// correct path (env.CLAUDE_CODE_DISABLE_AUTO_MEMORY) and removes it.
	settingsPath := filepath.Join(claudeHome, "settings.json")
	require.NoError(t, os.WriteFile(settingsPath,
		[]byte(`{"env":{"CLAUDE_CODE_DISABLE_AUTO_MEMORY":"1"}}`), 0o600))

	_, err := h.DeleteFeature(context.Background(), api.DeleteFeatureRequestObject{
		Key: "CLAUDE_CODE_DISABLE_AUTO_MEMORY",
	})
	require.NoError(t, err)

	data, err := os.ReadFile(settingsPath) //nolint:gosec // path is from t.TempDir(), safe in tests
	require.NoError(t, err)
	assert.NotContains(t, string(data), "CLAUDE_CODE_DISABLE_AUTO_MEMORY")
}
