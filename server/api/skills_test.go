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

func writeSkillFile(t *testing.T, skillsDir, folderName, body string) {
	t.Helper()
	dir := filepath.Join(skillsDir, folderName)
	require.NoError(t, os.MkdirAll(dir, 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(dir, "SKILL.md"), []byte(body), 0o644))
}

// Issue D: GetSkill must reject path traversal via the name (folder) parameter

func TestGetSkill_RejectsPathTraversalViaName(t *testing.T) {
	h, claudeHome := newTestHandler(t)

	// Place a SKILL.md directly at the claude home root (outside skills dir)
	require.NoError(t, os.WriteFile(filepath.Join(claudeHome, "SKILL.md"), []byte("---\nname: Escape\n---\nBody"), 0o644))

	// Ensure the skills dir exists
	require.NoError(t, os.MkdirAll(filepath.Join(claudeHome, "skills"), 0o755))

	// name=".." resolves to claudeHome, so it would read claudeHome/SKILL.md
	_, err := h.GetSkill(context.Background(), api.GetSkillRequestObject{
		Scope:  "global",
		Name:   "..",
		Params: api.GetSkillParams{},
	})
	require.Error(t, err, "GetSkill must reject path traversal via name parameter")
}

func TestGetSkill_AllowsLegitimateRead(t *testing.T) {
	h, claudeHome := newTestHandler(t)

	skillsDir := filepath.Join(claudeHome, "skills")
	writeSkillFile(t, skillsDir, "myskill", "---\nname: My Skill\ndescription: Does things\n---\nBody")

	resp, err := h.GetSkill(context.Background(), api.GetSkillRequestObject{
		Scope:  "global",
		Name:   "myskill",
		Params: api.GetSkillParams{},
	})
	require.NoError(t, err, "GetSkill must work for a legitimate request")
	detail, ok := resp.(api.GetSkill200JSONResponse)
	require.True(t, ok)
	assert.Equal(t, "My Skill", detail.Name)
}

// Issue C: IsUserOwned write guard — CreateSkill must reject plugin-cache targets

func TestCreateSkill_RejectsPluginCacheTarget(t *testing.T) {
	h, claudeHome := newTestHandler(t)

	cacheDir := filepath.Join(claudeHome, "plugins", "cache")
	require.NoError(t, os.MkdirAll(cacheDir, 0o755))

	scope := api.CreateSkillRequestScopeProject
	_, err := h.CreateSkill(context.Background(), api.CreateSkillRequestObject{
		Body: &api.CreateSkillJSONRequestBody{
			Scope:       scope,
			ProjectPath: &cacheDir,
			Name:        "evil-skill",
			Body:        "# evil skill",
		},
	})
	require.Error(t, err, "CreateSkill must reject writes to the plugin cache")
	assert.Contains(t, err.Error(), "plugin-managed")
}
