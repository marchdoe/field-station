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

// helpers

// registerProject creates the encoded project directory entry in claudeHome/projects/
// so that resolveProjectPath recognises projectPath as a valid root.
// Returns the encoded project ID.
func registerProject(t *testing.T, claudeHome, projectPath string) string {
	t.Helper()
	withoutSlash := strings.TrimPrefix(projectPath, "/")
	encoded := "-" + strings.ReplaceAll(withoutSlash, "/", "-")
	require.NoError(t, os.MkdirAll(filepath.Join(claudeHome, "projects", encoded), 0o755))
	return encoded
}

func newTestHandler(t *testing.T) (*api.FieldStationHandler, string) {
	t.Helper()
	claudeHome := t.TempDir()
	t.Setenv("CLAUDE_HOME", claudeHome)
	return api.NewHandler(claudeHome, false), claudeHome
}

func writeAgentFile(t *testing.T, dir, name, content string) {
	t.Helper()
	require.NoError(t, os.MkdirAll(dir, 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(dir, name+".md"), []byte(content), 0o644))
}

// Issue C: IsUserOwned write guard — CreateAgent must reject plugin-cache targets

func TestCreateAgent_RejectsPluginCacheTarget(t *testing.T) {
	h, claudeHome := newTestHandler(t)

	// projectId for the plugin cache dir — register it so resolveProjectPath passes,
	// but the resulting agentDir (inside plugins/cache) is not user-owned.
	cacheDir := filepath.Join(claudeHome, "plugins", "cache")
	require.NoError(t, os.MkdirAll(cacheDir, 0o755))
	encoded := registerProject(t, claudeHome, cacheDir)

	scope := api.CreateAgentRequestScopeProject
	_, err := h.CreateAgent(context.Background(), api.CreateAgentRequestObject{
		Body: &api.CreateAgentJSONRequestBody{
			Scope:     scope,
			ProjectId: &encoded,
			Name:      "evil-agent",
			Body:      "# body",
		},
	})
	require.Error(t, err, "CreateAgent must reject writes to the plugin cache")
	assert.Contains(t, err.Error(), "plugin-managed")
}

// Issue C: IsUserOwned write guard — DeleteAgent must reject plugin-cache targets

func TestDeleteAgent_RejectsPluginCacheTarget(t *testing.T) {
	h, claudeHome := newTestHandler(t)

	cacheDir := filepath.Join(claudeHome, "plugins", "cache")
	agentDir := filepath.Join(cacheDir, ".claude", "agents")
	writeAgentFile(t, agentDir, "managed", "---\nname: Managed\n---\nBody")
	encoded := registerProject(t, claudeHome, cacheDir)

	scope := api.DeleteAgentRequestScopeProject
	_, err := h.DeleteAgent(context.Background(), api.DeleteAgentRequestObject{
		Name: "managed",
		Body: &api.DeleteAgentJSONRequestBody{
			Scope:     scope,
			ProjectId: &encoded,
		},
	})
	require.Error(t, err, "DeleteAgent must reject deletes from the plugin cache")
	assert.Contains(t, err.Error(), "plugin-managed")
}

// Issue F: DeleteAgent must validate agentDir against allowed roots (same as Create/Update)

func TestDeleteAgent_ValidatesScopeAndProjectPath(t *testing.T) {
	h, claudeHome := newTestHandler(t)

	// Valid global agent: create then delete succeeds
	agentDir := filepath.Join(claudeHome, "agents")
	writeAgentFile(t, agentDir, "to-delete", "---\nname: To Delete\n---\nBody")

	_, err := h.DeleteAgent(context.Background(), api.DeleteAgentRequestObject{
		Name: "to-delete",
		Body: &api.DeleteAgentJSONRequestBody{
			Scope: api.DeleteAgentRequestScopeGlobal,
		},
	})
	require.NoError(t, err, "DeleteAgent should succeed for a valid global agent")
}

// Issue M: Project-scope agent updates must write backup to the global claudeHome

func TestUpdateAgent_ProjectScope_BackupGoesToGlobalClaudeHome(t *testing.T) {
	h, claudeHome := newTestHandler(t)
	projectDir := t.TempDir()
	encoded := registerProject(t, claudeHome, projectDir)

	// Create a project-scope agent
	agentDir := filepath.Join(projectDir, ".claude", "agents")
	writeAgentFile(t, agentDir, "myagent", "---\nname: My Agent\n---\nOld body")

	scope := api.UpdateAgentRequestScopeProject
	_, err := h.UpdateAgent(context.Background(), api.UpdateAgentRequestObject{
		Name: "myagent",
		Body: &api.UpdateAgentJSONRequestBody{
			Scope:     scope,
			ProjectId: &encoded,
			Body:      "New body",
		},
	})
	require.NoError(t, err)

	// Backup must appear in the global claudeHome/backups/, not only in the project dir
	entries, err := os.ReadDir(filepath.Join(claudeHome, "backups"))
	require.NoError(t, err, "claudeHome/backups/ should exist after update")
	assert.NotEmpty(t, entries, "at least one backup should be written to claudeHome/backups/")
}

func TestDeleteAgent_ProjectScope_BackupGoesToGlobalClaudeHome(t *testing.T) {
	h, claudeHome := newTestHandler(t)
	projectDir := t.TempDir()
	encoded := registerProject(t, claudeHome, projectDir)

	agentDir := filepath.Join(projectDir, ".claude", "agents")
	writeAgentFile(t, agentDir, "myagent", "---\nname: My Agent\n---\nBody")

	scope := api.DeleteAgentRequestScopeProject
	_, err := h.DeleteAgent(context.Background(), api.DeleteAgentRequestObject{
		Name: "myagent",
		Body: &api.DeleteAgentJSONRequestBody{
			Scope:     scope,
			ProjectId: &encoded,
		},
	})
	require.NoError(t, err)

	entries, err := os.ReadDir(filepath.Join(claudeHome, "backups"))
	require.NoError(t, err, "claudeHome/backups/ should exist after delete")
	assert.NotEmpty(t, entries, "at least one backup should be written to claudeHome/backups/")
}

// Unregistered project ID must be rejected — resolveProjectPath validates registration.

func TestUpdateAgent_RejectsUnregisteredProjectPath(t *testing.T) {
	h, _ := newTestHandler(t)
	fakeId := "-nonexistent-project"

	scope := api.UpdateAgentRequestScopeProject
	_, err := h.UpdateAgent(context.Background(), api.UpdateAgentRequestObject{
		Name: "victim",
		Body: &api.UpdateAgentJSONRequestBody{
			Scope:     scope,
			ProjectId: &fakeId,
			Body:      "Overwritten",
		},
	})
	require.Error(t, err, "UpdateAgent must reject unregistered project ids")
	assert.Contains(t, err.Error(), "unregistered")
}

func TestCreateAgent_RejectsUnregisteredProjectPath(t *testing.T) {
	h, _ := newTestHandler(t)
	fakeId := "-nonexistent-project"

	scope := api.CreateAgentRequestScopeProject
	_, err := h.CreateAgent(context.Background(), api.CreateAgentRequestObject{
		Body: &api.CreateAgentJSONRequestBody{
			Scope:     scope,
			ProjectId: &fakeId,
			Name:      "injected",
			Body:      "# injected agent",
		},
	})
	require.Error(t, err, "CreateAgent must reject unregistered project ids")
	assert.Contains(t, err.Error(), "unregistered")
}

func TestDeleteAgent_RejectsUnregisteredProjectPath(t *testing.T) {
	h, _ := newTestHandler(t)
	fakeId := "-nonexistent-project"

	scope := api.DeleteAgentRequestScopeProject
	_, err := h.DeleteAgent(context.Background(), api.DeleteAgentRequestObject{
		Name: "victim",
		Body: &api.DeleteAgentJSONRequestBody{
			Scope:     scope,
			ProjectId: &fakeId,
		},
	})
	require.Error(t, err, "DeleteAgent must reject unregistered project ids")
	assert.Contains(t, err.Error(), "unregistered")
}

// --- Happy path tests ---

func TestGetAgents_GlobalScope_EmptyWhenNoAgents(t *testing.T) {
	h, _ := newTestHandler(t)
	resp, err := h.GetAgents(context.Background(), api.GetAgentsRequestObject{
		Params: api.GetAgentsParams{},
	})
	require.NoError(t, err)
	result, ok := resp.(api.GetAgents200JSONResponse)
	require.True(t, ok)
	assert.Empty(t, result)
}

func TestGetAgents_GlobalScope_ReturnsList(t *testing.T) {
	h, claudeHome := newTestHandler(t)
	agentDir := filepath.Join(claudeHome, "agents")
	writeAgentFile(t, agentDir, "myagent", "---\nname: My Agent\ndescription: Does things\n---\nBody text")

	resp, err := h.GetAgents(context.Background(), api.GetAgentsRequestObject{
		Params: api.GetAgentsParams{},
	})
	require.NoError(t, err)
	result, ok := resp.(api.GetAgents200JSONResponse)
	require.True(t, ok)
	require.Len(t, result, 1)
	// Name field is the frontmatter display name, not the file ID.
	assert.Equal(t, "My Agent", result[0].Name)
}

func TestGetAgent_GlobalScope_ReturnsAgent(t *testing.T) {
	h, claudeHome := newTestHandler(t)
	agentDir := filepath.Join(claudeHome, "agents")
	writeAgentFile(t, agentDir, "myagent", "---\nname: My Agent\ndescription: Does things\n---\nBody text")

	scope := "global"
	resp, err := h.GetAgent(context.Background(), api.GetAgentRequestObject{
		Name:   "myagent",
		Params: api.GetAgentParams{Scope: &scope},
	})
	require.NoError(t, err)
	detail, ok := resp.(api.GetAgent200JSONResponse)
	require.True(t, ok)
	// Name field is the frontmatter display name.
	assert.Equal(t, "My Agent", detail.Name)
	assert.Equal(t, "Does things", detail.Description)
	assert.Contains(t, detail.Body, "Body text")
}
