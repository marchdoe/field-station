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
	require.NoError(t, os.MkdirAll(dir, 0o750))
	require.NoError(t, os.WriteFile(filepath.Join(dir, name+".md"), []byte(body), 0o600))
}

// Issue D: GetCommand must reject path traversal via the folder/name parameters

func TestGetCommand_RejectsPathTraversalViaFolder(t *testing.T) {
	h, claudeHome := newTestHandler(t)

	// Put a sensitive file just outside the commands directory
	sensitiveContent := "secret-token: abc123"
	require.NoError(t, os.WriteFile(filepath.Join(claudeHome, "secrets.md"), []byte(sensitiveContent), 0o600))

	// Ensure the commands dir exists so resolveCommandDir doesn't fail early
	require.NoError(t, os.MkdirAll(filepath.Join(claudeHome, "commands"), 0o750))

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
	require.NoError(t, os.MkdirAll(cacheDir, 0o750))
	encoded := registerProject(t, claudeHome, cacheDir)

	scope := api.CreateCommandRequestScopeProject
	_, err := h.CreateCommand(context.Background(), api.CreateCommandRequestObject{
		Body: &api.CreateCommandJSONRequestBody{
			Scope:     scope,
			ProjectId: &encoded,
			Folder:    "myfolder",
			Name:      "evil",
			Body:      "# evil command",
		},
	})
	require.Error(t, err, "CreateCommand must reject writes to the plugin cache")
	assert.Contains(t, err.Error(), "plugin-managed")
}

// Unregistered project ID must be rejected

func TestUpdateCommand_RejectsUnregisteredProjectPath(t *testing.T) {
	h, _ := newTestHandler(t)
	fakeID := "-nonexistent-project"

	scope := "project"
	_, err := h.UpdateCommand(context.Background(), api.UpdateCommandRequestObject{
		Scope:  scope,
		Folder: "myfolder",
		Name:   "mycmd",
		Body: &api.UpdateCommandJSONRequestBody{
			ProjectId: &fakeID,
			Body:      "# bad command",
		},
	})
	require.Error(t, err, "UpdateCommand must reject unregistered project ids")
	assert.Contains(t, err.Error(), "unregistered")
}

func TestDeleteCommand_RejectsUnregisteredProjectPath(t *testing.T) {
	h, _ := newTestHandler(t)
	fakeID := "-nonexistent-project"

	scope := "project"
	_, err := h.DeleteCommand(context.Background(), api.DeleteCommandRequestObject{
		Scope:  scope,
		Folder: "myfolder",
		Name:   "mycmd",
		Params: api.DeleteCommandParams{ProjectId: &fakeID},
	})
	require.Error(t, err, "DeleteCommand must reject unregistered project ids")
	assert.Contains(t, err.Error(), "unregistered")
}

// --- Happy path tests ---

func TestGetCommands_GlobalScope_EmptyWhenNoCommands(t *testing.T) {
	h, _ := newTestHandler(t)
	resp, err := h.GetCommands(context.Background(), api.GetCommandsRequestObject{
		Params: api.GetCommandsParams{},
	})
	require.NoError(t, err)
	result, ok := resp.(api.GetCommands200JSONResponse)
	require.True(t, ok)
	assert.Empty(t, result)
}

func TestGetCommands_GlobalScope_ReturnsList(t *testing.T) {
	h, claudeHome := newTestHandler(t)
	commandDir := filepath.Join(claudeHome, "commands")
	writeCommandFile(t, commandDir, "myfolder", "mycmd", "# My command body")

	resp, err := h.GetCommands(context.Background(), api.GetCommandsRequestObject{
		Params: api.GetCommandsParams{},
	})
	require.NoError(t, err)
	result, ok := resp.(api.GetCommands200JSONResponse)
	require.True(t, ok)
	require.Len(t, result, 1)
	assert.Equal(t, "mycmd", result[0].Name)
	assert.Equal(t, "myfolder", result[0].Folder)
}
