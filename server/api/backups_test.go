package api_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"fieldstation/api"
	"fieldstation/lib"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetBackups_EmptyWhenNoBackups(t *testing.T) {
	h, _ := newTestHandler(t)

	resp, err := h.GetBackups(context.Background(), api.GetBackupsRequestObject{})
	require.NoError(t, err)
	result, ok := resp.(api.GetBackups200JSONResponse)
	require.True(t, ok)
	assert.Empty(t, result)
}

func TestGetBackups_ReturnsEntries(t *testing.T) {
	h, claudeHome := newTestHandler(t)

	// Create a file and back it up using lib.BackupFile.
	original := filepath.Join(claudeHome, "test.json")
	require.NoError(t, os.WriteFile(original, []byte(`{"key":"value"}`), 0o600))
	lib.BackupFile(original, lib.BackupOpUpdate, claudeHome)

	resp, err := h.GetBackups(context.Background(), api.GetBackupsRequestObject{})
	require.NoError(t, err)
	result, ok := resp.(api.GetBackups200JSONResponse)
	require.True(t, ok)
	assert.NotEmpty(t, result, "should have at least one backup entry")
	assert.Equal(t, original, result[0].OriginalPath)
}

func TestRestoreBackup_RestoresFile(t *testing.T) {
	h, claudeHome := newTestHandler(t)

	// Create and back up a file.
	original := filepath.Join(claudeHome, "agents", "test.md")
	require.NoError(t, os.MkdirAll(filepath.Dir(original), 0o750))
	require.NoError(t, os.WriteFile(original, []byte("original content"), 0o600))
	lib.BackupFile(original, lib.BackupOpUpdate, claudeHome)

	// Overwrite the original.
	require.NoError(t, os.WriteFile(original, []byte("overwritten"), 0o600))

	// Get backup ID from listing.
	backups := lib.ListBackups(claudeHome)
	require.NotEmpty(t, backups, "need a backup to restore")
	backupID := backups[0].ID

	_, err := h.RestoreBackup(context.Background(), api.RestoreBackupRequestObject{
		Id: backupID,
	})
	require.NoError(t, err)

	// Original file should be restored.
	data, err := os.ReadFile(original) //nolint:gosec // path is from t.TempDir(), safe in tests
	require.NoError(t, err)
	assert.Equal(t, "original content", string(data))
}
