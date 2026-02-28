package lib_test

import (
	"os"
	"path/filepath"
	"testing"

	"fieldstation/lib"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCredentialsExist_FalseWhenNoFile(t *testing.T) {
	claudeHome := t.TempDir()
	exists, err := lib.CredentialsExist(claudeHome)
	require.NoError(t, err)
	assert.False(t, exists)
}

func TestCredentialsExist_TrueWhenFilePresent(t *testing.T) {
	claudeHome := t.TempDir()
	creds := &lib.Credentials{PasswordHash: "$2a$12$abc", SigningKey: "key"}
	require.NoError(t, lib.SaveCredentials(claudeHome, creds))

	exists, err := lib.CredentialsExist(claudeHome)
	require.NoError(t, err)
	assert.True(t, exists)
}

func TestSaveAndLoadCredentials(t *testing.T) {
	claudeHome := t.TempDir()
	creds := &lib.Credentials{PasswordHash: "$2a$12$abc", SigningKey: "mysigningkey"}

	require.NoError(t, lib.SaveCredentials(claudeHome, creds))

	loaded, err := lib.LoadCredentials(claudeHome)
	require.NoError(t, err)
	require.NotNil(t, loaded)
	assert.Equal(t, creds.PasswordHash, loaded.PasswordHash)
	assert.Equal(t, creds.SigningKey, loaded.SigningKey)
}

func TestLoadCredentials_ReturnsNilWhenNoFile(t *testing.T) {
	claudeHome := t.TempDir()
	loaded, err := lib.LoadCredentials(claudeHome)
	require.NoError(t, err)
	assert.Nil(t, loaded)
}

func TestSaveCredentials_FileMode(t *testing.T) {
	claudeHome := t.TempDir()
	creds := &lib.Credentials{PasswordHash: "hash", SigningKey: "key"}
	require.NoError(t, lib.SaveCredentials(claudeHome, creds))

	info, err := os.Stat(filepath.Join(claudeHome, "field-station-credentials"))
	require.NoError(t, err)
	assert.Equal(t, os.FileMode(0o600), info.Mode().Perm())
}

func TestHashAndVerifyPassword(t *testing.T) {
	hash, err := lib.HashPassword("my-password")
	require.NoError(t, err)
	assert.True(t, lib.VerifyPassword("my-password", hash))
	assert.False(t, lib.VerifyPassword("wrong-password", hash))
}

func TestGenerateSigningKey_IsUnique(t *testing.T) {
	k1, err := lib.GenerateSigningKey()
	require.NoError(t, err)
	k2, err := lib.GenerateSigningKey()
	require.NoError(t, err)
	assert.NotEqual(t, k1, k2)
	assert.Len(t, k1, 64) // 32 bytes = 64 hex chars
}
