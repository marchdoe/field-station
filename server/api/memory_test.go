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

func memoryDir(claudeHome, projectId string) string {
	return filepath.Join(claudeHome, "projects", projectId, "memory")
}

func writeMemoryFile(t *testing.T, dir, filename, content string) {
	t.Helper()
	require.NoError(t, os.MkdirAll(dir, 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(dir, filename), []byte(content), 0o644))
}

// --- ListMemory ---

func TestListMemory_EmptyDir(t *testing.T) {
	h, claudeHome := newTestHandler(t)
	projectDir := t.TempDir()
	encoded := registerProject(t, claudeHome, projectDir)

	resp, err := h.ListMemory(context.Background(), api.ListMemoryRequestObject{
		Params: api.ListMemoryParams{ProjectId: encoded},
	})
	require.NoError(t, err)
	result, ok := resp.(api.ListMemory200JSONResponse)
	require.True(t, ok)
	assert.Empty(t, result)
}

func TestListMemory_ReturnsMdFiles(t *testing.T) {
	h, claudeHome := newTestHandler(t)
	projectDir := t.TempDir()
	encoded := registerProject(t, claudeHome, projectDir)
	dir := memoryDir(claudeHome, encoded)
	writeMemoryFile(t, dir, "MEMORY.md", "# My memory")
	writeMemoryFile(t, dir, "notes.md", "Some notes")
	// a non-.md file should be ignored
	require.NoError(t, os.WriteFile(filepath.Join(dir, "ignore.txt"), []byte("skip"), 0o644))

	resp, err := h.ListMemory(context.Background(), api.ListMemoryRequestObject{
		Params: api.ListMemoryParams{ProjectId: encoded},
	})
	require.NoError(t, err)
	result, ok := resp.(api.ListMemory200JSONResponse)
	require.True(t, ok)
	assert.Len(t, result, 2)
}

func TestListMemory_RejectsUnregisteredProject(t *testing.T) {
	h, _ := newTestHandler(t)
	_, err := h.ListMemory(context.Background(), api.ListMemoryRequestObject{
		Params: api.ListMemoryParams{ProjectId: "-nonexistent"},
	})
	require.Error(t, err)
}

// --- GetMemory ---

func TestGetMemory_ReturnsContent(t *testing.T) {
	h, claudeHome := newTestHandler(t)
	projectDir := t.TempDir()
	encoded := registerProject(t, claudeHome, projectDir)
	dir := memoryDir(claudeHome, encoded)
	writeMemoryFile(t, dir, "MEMORY.md", "# Memory content")

	resp, err := h.GetMemory(context.Background(), api.GetMemoryRequestObject{
		Filename: "MEMORY.md",
		Params:   api.GetMemoryParams{ProjectId: encoded},
	})
	require.NoError(t, err)
	result, ok := resp.(api.GetMemory200JSONResponse)
	require.True(t, ok)
	assert.Equal(t, "# Memory content", result.Content)
	assert.Equal(t, "MEMORY.md", result.Filename)
}

func TestGetMemory_RejectsPathTraversal(t *testing.T) {
	h, claudeHome := newTestHandler(t)
	projectDir := t.TempDir()
	encoded := registerProject(t, claudeHome, projectDir)

	_, err := h.GetMemory(context.Background(), api.GetMemoryRequestObject{
		Filename: "../evil.md",
		Params:   api.GetMemoryParams{ProjectId: encoded},
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid filename")
}

func TestGetMemory_RejectsNonMdExtension(t *testing.T) {
	h, claudeHome := newTestHandler(t)
	projectDir := t.TempDir()
	encoded := registerProject(t, claudeHome, projectDir)

	_, err := h.GetMemory(context.Background(), api.GetMemoryRequestObject{
		Filename: "evil.sh",
		Params:   api.GetMemoryParams{ProjectId: encoded},
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid filename")
}

// --- CreateMemory ---

func TestCreateMemory_WritesFile(t *testing.T) {
	h, claudeHome := newTestHandler(t)
	projectDir := t.TempDir()
	encoded := registerProject(t, claudeHome, projectDir)

	_, err := h.CreateMemory(context.Background(), api.CreateMemoryRequestObject{
		Body: &api.CreateMemoryJSONRequestBody{
			Filename:  "notes.md",
			Content:   "# Notes",
			ProjectId: encoded,
		},
	})
	require.NoError(t, err)

	got, err := os.ReadFile(filepath.Join(memoryDir(claudeHome, encoded), "notes.md"))
	require.NoError(t, err)
	assert.Equal(t, "# Notes", string(got))
}

func TestCreateMemory_RejectsPathTraversal(t *testing.T) {
	h, claudeHome := newTestHandler(t)
	projectDir := t.TempDir()
	encoded := registerProject(t, claudeHome, projectDir)

	_, err := h.CreateMemory(context.Background(), api.CreateMemoryRequestObject{
		Body: &api.CreateMemoryJSONRequestBody{
			Filename:  "../evil.md",
			Content:   "bad",
			ProjectId: encoded,
		},
	})
	require.Error(t, err)
}

// --- UpdateMemory ---

func TestUpdateMemory_OverwritesAndBacksUp(t *testing.T) {
	h, claudeHome := newTestHandler(t)
	projectDir := t.TempDir()
	encoded := registerProject(t, claudeHome, projectDir)
	dir := memoryDir(claudeHome, encoded)
	writeMemoryFile(t, dir, "MEMORY.md", "old content")

	_, err := h.UpdateMemory(context.Background(), api.UpdateMemoryRequestObject{
		Filename: "MEMORY.md",
		Body: &api.UpdateMemoryJSONRequestBody{
			Content:   "new content",
			ProjectId: encoded,
		},
	})
	require.NoError(t, err)

	got, err := os.ReadFile(filepath.Join(dir, "MEMORY.md"))
	require.NoError(t, err)
	assert.Equal(t, "new content", string(got))

	entries, err := os.ReadDir(filepath.Join(claudeHome, "backups"))
	require.NoError(t, err)
	assert.NotEmpty(t, entries)
}

// --- DeleteMemory ---

func TestDeleteMemory_RemovesFileAndBacksUp(t *testing.T) {
	h, claudeHome := newTestHandler(t)
	projectDir := t.TempDir()
	encoded := registerProject(t, claudeHome, projectDir)
	dir := memoryDir(claudeHome, encoded)
	writeMemoryFile(t, dir, "MEMORY.md", "content")

	_, err := h.DeleteMemory(context.Background(), api.DeleteMemoryRequestObject{
		Filename: "MEMORY.md",
		Params:   api.DeleteMemoryParams{ProjectId: encoded},
	})
	require.NoError(t, err)

	_, err = os.Stat(filepath.Join(dir, "MEMORY.md"))
	assert.True(t, os.IsNotExist(err), "file should be deleted")

	entries, err := os.ReadDir(filepath.Join(claudeHome, "backups"))
	require.NoError(t, err)
	assert.NotEmpty(t, entries)
}
