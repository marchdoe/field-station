package lib_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"fieldstation/lib"
)

func TestVersionPersistence_RoundTrip(t *testing.T) {
	dir := t.TempDir()
	require.NoError(t, lib.WritePersistedVersion(dir, "1.2.3"))
	got := lib.ReadPersistedVersion(dir)
	assert.Equal(t, "1.2.3", got)
}

func TestVersionPersistence_NoFile(t *testing.T) {
	dir := t.TempDir()
	got := lib.ReadPersistedVersion(dir)
	assert.Equal(t, "", got)
}

func TestVersionPersistence_WriteEmpty(t *testing.T) {
	dir := t.TempDir()
	require.NoError(t, lib.WritePersistedVersion(dir, ""))
	got := lib.ReadPersistedVersion(dir)
	// Empty string stored as null → reads back as ""
	assert.Equal(t, "", got)
}

func TestVersionPersistence_MalformedJSON(t *testing.T) {
	dir := t.TempDir()
	err := os.WriteFile(filepath.Join(dir, "claude-version.json"), []byte("not json"), 0o644)
	require.NoError(t, err)
	got := lib.ReadPersistedVersion(dir)
	assert.Equal(t, "", got)
}

func TestVersionPersistence_MissingVersionField(t *testing.T) {
	dir := t.TempDir()
	err := os.WriteFile(filepath.Join(dir, "claude-version.json"), []byte(`{"other":"field"}`), 0o644)
	require.NoError(t, err)
	got := lib.ReadPersistedVersion(dir)
	assert.Equal(t, "", got)
}

func TestVersionPersistence_CreatesDir(t *testing.T) {
	parent := t.TempDir()
	subDir := filepath.Join(parent, "nested", "subdir")
	require.NoError(t, lib.WritePersistedVersion(subDir, "3.0.0"))
	got := lib.ReadPersistedVersion(subDir)
	assert.Equal(t, "3.0.0", got)
}
