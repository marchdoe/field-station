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
// so that GetAllowedRoots recognises projectPath as a valid root.
func registerProject(t *testing.T, claudeHome, projectPath string) {
	t.Helper()
	withoutSlash := strings.TrimPrefix(projectPath, "/")
	encoded := "-" + strings.ReplaceAll(withoutSlash, "/", "-")
	require.NoError(t, os.MkdirAll(filepath.Join(claudeHome, "projects", encoded), 0o755))
}

func newTestHandler(t *testing.T) (*api.FieldStationHandler, string) {
	t.Helper()
	claudeHome := t.TempDir()
	t.Setenv("CLAUDE_HOME", claudeHome)
	return api.NewHandler(claudeHome, ""), claudeHome
}

func writeAgentFile(t *testing.T, dir, name, content string) {
	t.Helper()
	require.NoError(t, os.MkdirAll(dir, 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(dir, name+".md"), []byte(content), 0o644))
}

// Issue C: IsUserOwned write guard — CreateAgent must reject plugin-cache targets

func TestCreateAgent_RejectsPluginCacheTarget(t *testing.T) {
	h, claudeHome := newTestHandler(t)

	// projectPath inside the plugin cache → agentDir is cache/.claude/agents → not user-owned
	cacheDir := filepath.Join(claudeHome, "plugins", "cache")
	require.NoError(t, os.MkdirAll(cacheDir, 0o755))

	scope := api.CreateAgentRequestScopeProject
	_, err := h.CreateAgent(context.Background(), api.CreateAgentRequestObject{
		Body: &api.CreateAgentJSONRequestBody{
			Scope:       scope,
			ProjectPath: &cacheDir,
			Name:        "evil-agent",
			Body:        "# body",
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

	scope := api.DeleteAgentRequestScopeProject
	_, err := h.DeleteAgent(context.Background(), api.DeleteAgentRequestObject{
		Name: "managed",
		Body: &api.DeleteAgentJSONRequestBody{
			Scope:       scope,
			ProjectPath: &cacheDir,
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
	registerProject(t, claudeHome, projectDir)

	// Create a project-scope agent
	agentDir := filepath.Join(projectDir, ".claude", "agents")
	writeAgentFile(t, agentDir, "myagent", "---\nname: My Agent\n---\nOld body")

	scope := api.UpdateAgentRequestScopeProject
	_, err := h.UpdateAgent(context.Background(), api.UpdateAgentRequestObject{
		Name: "myagent",
		Body: &api.UpdateAgentJSONRequestBody{
			Scope:       scope,
			ProjectPath: &projectDir,
			Body:        "New body",
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
	registerProject(t, claudeHome, projectDir)

	agentDir := filepath.Join(projectDir, ".claude", "agents")
	writeAgentFile(t, agentDir, "myagent", "---\nname: My Agent\n---\nBody")

	scope := api.DeleteAgentRequestScopeProject
	_, err := h.DeleteAgent(context.Background(), api.DeleteAgentRequestObject{
		Name: "myagent",
		Body: &api.DeleteAgentJSONRequestBody{
			Scope:       scope,
			ProjectPath: &projectDir,
		},
	})
	require.NoError(t, err)

	entries, err := os.ReadDir(filepath.Join(claudeHome, "backups"))
	require.NoError(t, err, "claudeHome/backups/ should exist after delete")
	assert.NotEmpty(t, entries, "at least one backup should be written to claudeHome/backups/")
}

// Circular projectPath validation fix — unregistered project path must be rejected.
// Previously, handlers added user-supplied projectPath to allowedRoots, making the
// AssertSafePath check tautological (filePath always passed because its parent was
// in the allow list). Now GetAllowedRoots is used, which only allows paths that are
// already registered in ~/.claude/projects/.

func TestUpdateAgent_RejectsUnregisteredProjectPath(t *testing.T) {
	h, _ := newTestHandler(t)
	unregistered := t.TempDir() // not in ~/.claude/projects/

	agentDir := filepath.Join(unregistered, ".claude", "agents")
	writeAgentFile(t, agentDir, "victim", "---\nname: Victim\n---\nBody")

	scope := api.UpdateAgentRequestScopeProject
	_, err := h.UpdateAgent(context.Background(), api.UpdateAgentRequestObject{
		Name: "victim",
		Body: &api.UpdateAgentJSONRequestBody{
			Scope:       scope,
			ProjectPath: &unregistered,
			Body:        "Overwritten",
		},
	})
	require.Error(t, err, "UpdateAgent must reject unregistered project paths")
	assert.Contains(t, err.Error(), "outside allowed")
}

func TestCreateAgent_RejectsUnregisteredProjectPath(t *testing.T) {
	h, _ := newTestHandler(t)
	unregistered := t.TempDir()

	scope := api.CreateAgentRequestScopeProject
	_, err := h.CreateAgent(context.Background(), api.CreateAgentRequestObject{
		Body: &api.CreateAgentJSONRequestBody{
			Scope:       scope,
			ProjectPath: &unregistered,
			Name:        "injected",
			Body:        "# injected agent",
		},
	})
	require.Error(t, err, "CreateAgent must reject unregistered project paths")
	assert.Contains(t, err.Error(), "outside allowed")
}

func TestDeleteAgent_RejectsUnregisteredProjectPath(t *testing.T) {
	h, _ := newTestHandler(t)
	unregistered := t.TempDir()

	agentDir := filepath.Join(unregistered, ".claude", "agents")
	writeAgentFile(t, agentDir, "victim", "---\nname: Victim\n---\nBody")

	scope := api.DeleteAgentRequestScopeProject
	_, err := h.DeleteAgent(context.Background(), api.DeleteAgentRequestObject{
		Name: "victim",
		Body: &api.DeleteAgentJSONRequestBody{
			Scope:       scope,
			ProjectPath: &unregistered,
		},
	})
	require.Error(t, err, "DeleteAgent must reject unregistered project paths")
	assert.Contains(t, err.Error(), "outside allowed")
}
