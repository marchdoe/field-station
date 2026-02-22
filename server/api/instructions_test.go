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

// --- GetInstructions ---

func TestGetInstructions_GlobalScope_BothAbsent(t *testing.T) {
	h, claudeHome := newTestHandler(t)
	_ = claudeHome

	scope := api.GetInstructionsParamsScopeGlobal
	resp, err := h.GetInstructions(context.Background(), api.GetInstructionsRequestObject{
		Params: api.GetInstructionsParams{Scope: &scope},
	})
	require.NoError(t, err)
	result, ok := resp.(api.GetInstructions200JSONResponse)
	require.True(t, ok)
	assert.False(t, result.Main.Exists)
	assert.False(t, result.Local.Exists)
	assert.Nil(t, result.Main.Content)
	assert.Nil(t, result.Local.Content)
}

func TestGetInstructions_GlobalScope_MainPresent(t *testing.T) {
	h, claudeHome := newTestHandler(t)
	require.NoError(t, os.WriteFile(filepath.Join(claudeHome, "CLAUDE.md"), []byte("# Hello"), 0o644))

	scope := api.GetInstructionsParamsScopeGlobal
	resp, err := h.GetInstructions(context.Background(), api.GetInstructionsRequestObject{
		Params: api.GetInstructionsParams{Scope: &scope},
	})
	require.NoError(t, err)
	result, ok := resp.(api.GetInstructions200JSONResponse)
	require.True(t, ok)
	assert.True(t, result.Main.Exists)
	require.NotNil(t, result.Main.Content)
	assert.Equal(t, "# Hello", *result.Main.Content)
	assert.False(t, result.Local.Exists)
}

func TestGetInstructions_ProjectScope_ReturnsProjectFiles(t *testing.T) {
	h, claudeHome := newTestHandler(t)
	projectDir := t.TempDir()
	encoded := registerProject(t, claudeHome, projectDir)
	require.NoError(t, os.WriteFile(filepath.Join(projectDir, "CLAUDE.md"), []byte("# Project"), 0o644))

	scope := api.GetInstructionsParamsScopeProject
	resp, err := h.GetInstructions(context.Background(), api.GetInstructionsRequestObject{
		Params: api.GetInstructionsParams{Scope: &scope, ProjectId: &encoded},
	})
	require.NoError(t, err)
	result, ok := resp.(api.GetInstructions200JSONResponse)
	require.True(t, ok)
	assert.True(t, result.Main.Exists)
	require.NotNil(t, result.Main.Content)
	assert.Equal(t, "# Project", *result.Main.Content)
}

func TestGetInstructions_ProjectScope_MissingProjectId(t *testing.T) {
	h, _ := newTestHandler(t)
	scope := api.GetInstructionsParamsScopeProject
	_, err := h.GetInstructions(context.Background(), api.GetInstructionsRequestObject{
		Params: api.GetInstructionsParams{Scope: &scope},
	})
	require.Error(t, err)
}

// --- UpdateInstructions ---

func TestUpdateInstructions_GlobalScope_WritesMainFile(t *testing.T) {
	h, claudeHome := newTestHandler(t)

	scope := api.UpdateInstructionsRequestScopeGlobal
	content := "# My Instructions"
	_, err := h.UpdateInstructions(context.Background(), api.UpdateInstructionsRequestObject{
		Body: &api.UpdateInstructionsJSONRequestBody{
			Scope:   &scope,
			File:    api.Main,
			Content: content,
		},
	})
	require.NoError(t, err)

	got, err := os.ReadFile(filepath.Join(claudeHome, "CLAUDE.md"))
	require.NoError(t, err)
	assert.Equal(t, content, string(got))
}

func TestUpdateInstructions_GlobalScope_WritesLocalFile(t *testing.T) {
	h, claudeHome := newTestHandler(t)

	scope := api.UpdateInstructionsRequestScopeGlobal
	content := "# Local override"
	_, err := h.UpdateInstructions(context.Background(), api.UpdateInstructionsRequestObject{
		Body: &api.UpdateInstructionsJSONRequestBody{
			Scope:   &scope,
			File:    api.Local,
			Content: content,
		},
	})
	require.NoError(t, err)

	got, err := os.ReadFile(filepath.Join(claudeHome, "CLAUDE.local.md"))
	require.NoError(t, err)
	assert.Equal(t, content, string(got))
}

func TestUpdateInstructions_ProjectScope_WritesProjectFile(t *testing.T) {
	h, claudeHome := newTestHandler(t)
	projectDir := t.TempDir()
	encoded := registerProject(t, claudeHome, projectDir)

	scope := api.UpdateInstructionsRequestScopeProject
	content := "# Project Instructions"
	_, err := h.UpdateInstructions(context.Background(), api.UpdateInstructionsRequestObject{
		Body: &api.UpdateInstructionsJSONRequestBody{
			Scope:     &scope,
			File:      api.Main,
			Content:   content,
			ProjectId: &encoded,
		},
	})
	require.NoError(t, err)

	got, err := os.ReadFile(filepath.Join(projectDir, "CLAUDE.md"))
	require.NoError(t, err)
	assert.Equal(t, content, string(got))
}

func TestUpdateInstructions_ProjectScope_CreatesBackup(t *testing.T) {
	h, claudeHome := newTestHandler(t)
	projectDir := t.TempDir()
	encoded := registerProject(t, claudeHome, projectDir)

	// Write an existing file so backup fires
	require.NoError(t, os.WriteFile(filepath.Join(projectDir, "CLAUDE.md"), []byte("old"), 0o644))

	scope := api.UpdateInstructionsRequestScopeProject
	content := "# New"
	_, err := h.UpdateInstructions(context.Background(), api.UpdateInstructionsRequestObject{
		Body: &api.UpdateInstructionsJSONRequestBody{
			Scope:     &scope,
			File:      api.Main,
			Content:   content,
			ProjectId: &encoded,
		},
	})
	require.NoError(t, err)

	entries, err := os.ReadDir(filepath.Join(claudeHome, "backups"))
	require.NoError(t, err)
	assert.NotEmpty(t, entries, "backup should be written to claudeHome/backups/")
}
