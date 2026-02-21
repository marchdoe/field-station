package lib_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"fieldstation/lib"
)

func TestWriteFileAtomic_CreatesFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "out.txt")
	require.NoError(t, lib.WriteFileAtomic(path, []byte("hello")))
	content, err := os.ReadFile(path)
	require.NoError(t, err)
	assert.Equal(t, "hello", string(content))
}

func TestWriteFileAtomic_OverwritesExisting(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "out.txt")
	require.NoError(t, lib.WriteFileAtomic(path, []byte("first")))
	require.NoError(t, lib.WriteFileAtomic(path, []byte("second")))
	content, err := os.ReadFile(path)
	require.NoError(t, err)
	assert.Equal(t, "second", string(content))
}

func TestWriteFileAtomic_NoTempFilesOnSuccess(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "out.txt")
	require.NoError(t, lib.WriteFileAtomic(path, []byte("data")))
	entries, err := os.ReadDir(dir)
	require.NoError(t, err)
	assert.Len(t, entries, 1, "should have only the final file")
}

func TestWriteFileAtomic_NonexistentDirectory(t *testing.T) {
	dir := t.TempDir()
	// Target path in a nonexistent subdirectory
	path := filepath.Join(dir, "nonexistent", "out.txt")
	err := lib.WriteFileAtomic(path, []byte("data"))
	assert.Error(t, err, "should error for nonexistent directory")
	// No temp files should remain in dir
	entries, readErr := os.ReadDir(dir)
	require.NoError(t, readErr)
	for _, e := range entries {
		assert.False(t, strings.HasPrefix(e.Name(), ".tmp-"), "no temp files should remain: %s", e.Name())
	}
}
