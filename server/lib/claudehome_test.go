package lib_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"fieldstation/lib"
)

func TestResolveClaudeHome_Default(t *testing.T) {
	os.Unsetenv("CLAUDE_HOME")
	home, err := os.UserHomeDir()
	require.NoError(t, err)
	assert.Equal(t, filepath.Join(home, ".claude"), lib.ResolveClaudeHome())
}

func TestResolveClaudeHome_EnvVar(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("CLAUDE_HOME", tmp)
	assert.Equal(t, tmp, lib.ResolveClaudeHome())
}

func TestResolveClaudeHome_EnvVarMissing(t *testing.T) {
	// If CLAUDE_HOME is set but path does not exist, fall back to ~/.claude
	t.Setenv("CLAUDE_HOME", "/nonexistent-path-abc123")
	home, err := os.UserHomeDir()
	require.NoError(t, err)
	assert.Equal(t, filepath.Join(home, ".claude"), lib.ResolveClaudeHome())
}
