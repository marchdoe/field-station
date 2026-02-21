package api_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"fieldstation/api"
)

// Issue R: UpdateConfigSetting and DeleteConfigSetting must correctly validate paths.
// The second AssertSafePath call (filepath.Dir(filePath)) was a no-op — this test
// ensures the mutation handlers still behave correctly after that dead code is removed.

func TestUpdateConfigSetting_GlobalSettings(t *testing.T) {
	h, claudeHome := newTestHandler(t)

	// Write an initial settings.json
	settingsPath := filepath.Join(claudeHome, "settings.json")
	require.NoError(t, os.WriteFile(settingsPath, []byte(`{"theme":"light"}`), 0o644))

	_, err := h.UpdateConfigSetting(context.Background(), api.UpdateConfigSettingRequestObject{
		Body: &api.UpdateConfigSettingJSONRequestBody{
			KeyPath: []string{"theme"},
			Value:   "dark",
		},
	})
	require.NoError(t, err)

	data, err := os.ReadFile(settingsPath)
	require.NoError(t, err)
	assert.Contains(t, string(data), "dark")
}

func TestDeleteConfigSetting_GlobalSettings(t *testing.T) {
	h, claudeHome := newTestHandler(t)

	settingsPath := filepath.Join(claudeHome, "settings.json")
	require.NoError(t, os.WriteFile(settingsPath, []byte(`{"theme":"dark","other":"value"}`), 0o644))

	_, err := h.DeleteConfigSetting(context.Background(), api.DeleteConfigSettingRequestObject{
		Body: &api.DeleteConfigSettingJSONRequestBody{
			KeyPath: []string{"theme"},
		},
	})
	require.NoError(t, err)

	data, err := os.ReadFile(settingsPath)
	require.NoError(t, err)
	assert.NotContains(t, string(data), "dark")
	assert.Contains(t, string(data), "other")
}

// --- Happy path tests ---

func TestGetConfig_GlobalScope_ReturnsLayers(t *testing.T) {
	h, claudeHome := newTestHandler(t)

	// Write a global settings file with a known value.
	settingsPath := filepath.Join(claudeHome, "settings.json")
	require.NoError(t, os.WriteFile(settingsPath, []byte(`{"theme":"dark"}`), 0o644))

	resp, err := h.GetConfig(context.Background(), api.GetConfigRequestObject{
		Params: api.GetConfigParams{},
	})
	require.NoError(t, err)
	cr, ok := resp.(api.GetConfig200JSONResponse)
	require.True(t, ok)
	assert.NotEmpty(t, cr.Layers, "should return config layers")
	// Merged config should include the theme key.
	assert.Equal(t, "dark", cr.Merged["theme"])
}

func TestMoveConfigSetting_GlobalUp_MovesToLocal(t *testing.T) {
	h, claudeHome := newTestHandler(t)

	// Put a key in global settings.
	settingsPath := filepath.Join(claudeHome, "settings.json")
	require.NoError(t, os.WriteFile(settingsPath, []byte(`{"verbosity":"verbose"}`), 0o644))

	_, err := h.MoveConfigSetting(context.Background(), api.MoveConfigSettingRequestObject{
		Body: &api.MoveConfigSettingJSONRequestBody{
			KeyPath:   []string{"verbosity"},
			Direction: api.Up,
		},
	})
	require.NoError(t, err)

	// Key must now appear in settings.local.json.
	localPath := filepath.Join(claudeHome, "settings.local.json")
	data, err := os.ReadFile(localPath)
	require.NoError(t, err)
	assert.Contains(t, string(data), "verbose")
}
