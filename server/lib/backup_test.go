package lib_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"fieldstation/lib"
)

func TestBackupFile_CreatesBackupEntry(t *testing.T) {
	claudeHome := t.TempDir()
	target := filepath.Join(claudeHome, "settings.json")
	require.NoError(t, os.WriteFile(target, []byte(`{"key":"value"}`), 0o600))

	dir := lib.BackupFile(target, lib.BackupOpUpdate, claudeHome)
	assert.NotEmpty(t, dir, "should return backup dir path")
	assert.FileExists(t, filepath.Join(dir, "meta.json"))
	assert.FileExists(t, filepath.Join(dir, "file"))

	var meta struct {
		OriginalPath string `json:"originalPath"`
		Operation    string `json:"operation"`
		Timestamp    string `json:"timestamp"`
	}
	data, err := os.ReadFile(filepath.Join(dir, "meta.json")) //nolint:gosec // path is a controlled backup directory in temp
	require.NoError(t, err)
	require.NoError(t, json.Unmarshal(data, &meta))
	assert.Equal(t, target, meta.OriginalPath)
	assert.Equal(t, "update", meta.Operation)
}

func TestBackupFile_NoErrorIfFileNotExists(t *testing.T) {
	claudeHome := t.TempDir()
	dir := lib.BackupFile("/nonexistent/file.json", lib.BackupOpDelete, claudeHome)
	assert.Empty(t, dir)
}

func TestListBackups_ReturnsSortedNewestFirst(t *testing.T) {
	claudeHome := t.TempDir()
	target := filepath.Join(claudeHome, "settings.json")
	require.NoError(t, os.WriteFile(target, []byte(`{}`), 0o600))

	lib.BackupFile(target, lib.BackupOpUpdate, claudeHome)
	time.Sleep(10 * time.Millisecond)
	lib.BackupFile(target, lib.BackupOpUpdate, claudeHome)

	entries := lib.ListBackups(claudeHome)
	require.Len(t, entries, 2)
	assert.True(t, entries[0].Timestamp.After(entries[1].Timestamp))
}

func TestRestoreBackup_RestoresFile(t *testing.T) {
	claudeHome := t.TempDir()
	t.Setenv("CLAUDE_HOME", claudeHome)
	target := filepath.Join(claudeHome, "settings.json")
	require.NoError(t, os.WriteFile(target, []byte(`{"original":true}`), 0o600))

	backupDir := lib.BackupFile(target, lib.BackupOpUpdate, claudeHome)
	require.NotEmpty(t, backupDir)

	require.NoError(t, os.WriteFile(target, []byte(`{"modified":true}`), 0o600))
	require.NoError(t, lib.RestoreBackup(backupDir, claudeHome))

	content, err := os.ReadFile(target) //nolint:gosec // target is a controlled temp file
	require.NoError(t, err)
	assert.Contains(t, string(content), `"original":true`)
}

func TestPruneOldBackups_RemovesOldEntries(t *testing.T) {
	claudeHome := t.TempDir()
	backupsDir := filepath.Join(claudeHome, "backups")
	require.NoError(t, os.MkdirAll(backupsDir, 0o750))

	oldDir := filepath.Join(backupsDir, "2020-01-01T00-00-00Z-aabbcc")
	require.NoError(t, os.MkdirAll(oldDir, 0o750))
	meta := `{"originalPath":"/tmp/x","operation":"update","timestamp":"2020-01-01T00:00:00Z"}`
	require.NoError(t, os.WriteFile(filepath.Join(oldDir, "meta.json"), []byte(meta), 0o600))
	require.NoError(t, os.WriteFile(filepath.Join(oldDir, "file"), []byte("data"), 0o600))

	lib.PruneOldBackups(claudeHome)
	assert.NoDirExists(t, oldDir)
}
