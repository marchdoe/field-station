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

// helpers (shared via agents_test.go — newTestHandler defined there)

func writeCommandFile(t *testing.T, commandDir, folder, name, body string) {
	t.Helper()
	dir := filepath.Join(commandDir, folder)
	require.NoError(t, os.MkdirAll(dir, 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(dir, name+".md"), []byte(body), 0o644))
}

// Issue D: GetCommand must reject path traversal via the folder/name parameters

func TestGetCommand_RejectsPathTraversalViaFolder(t *testing.T) {
	h, claudeHome := newTestHandler(t)

	// Put a sensitive file just outside the commands directory
	sensitiveContent := "secret-token: abc123"
	require.NoError(t, os.WriteFile(filepath.Join(claudeHome, "secrets.md"), []byte(sensitiveContent), 0o644))

	// Ensure the commands dir exists so resolveCommandDir doesn't fail early
	require.NoError(t, os.MkdirAll(filepath.Join(claudeHome, "commands"), 0o755))

	// folder=".." would resolve to claudeHome, letting the caller read secrets.md
	_, err := h.GetCommand(context.Background(), api.GetCommandRequestObject{
		Scope:  "global",
		Folder: "..",
		Name:   "secrets",
		Params: api.GetCommandParams{},
	})
	require.Error(t, err, "GetCommand must reject path traversal via folder parameter")
}

func TestGetCommand_AllowsLegitimateRead(t *testing.T) {
	h, claudeHome := newTestHandler(t)

	commandDir := filepath.Join(claudeHome, "commands")
	writeCommandFile(t, commandDir, "myfolder", "mycmd", "# My command")

	resp, err := h.GetCommand(context.Background(), api.GetCommandRequestObject{
		Scope:  "global",
		Folder: "myfolder",
		Name:   "mycmd",
		Params: api.GetCommandParams{},
	})
	require.NoError(t, err, "GetCommand must work for a legitimate request")
	detail, ok := resp.(api.GetCommand200JSONResponse)
	require.True(t, ok)
	assert.Equal(t, "mycmd", detail.Name)
}

// Issue C: IsUserOwned write guard — CreateCommand must reject plugin-cache targets

func TestCreateCommand_RejectsPluginCacheTarget(t *testing.T) {
	h, claudeHome := newTestHandler(t)

	cacheDir := filepath.Join(claudeHome, "plugins", "cache")
	require.NoError(t, os.MkdirAll(cacheDir, 0o755))

	scope := api.CreateCommandRequestScopeProject
	_, err := h.CreateCommand(context.Background(), api.CreateCommandRequestObject{
		Body: &api.CreateCommandJSONRequestBody{
			Scope:       scope,
			ProjectPath: &cacheDir,
			Folder:      "myfolder",
			Name:        "evil",
			Body:        "# evil command",
		},
	})
	require.Error(t, err, "CreateCommand must reject writes to the plugin cache")
	assert.Contains(t, err.Error(), "plugin-managed")
}
