package lib_test

import (
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"fieldstation/lib"
)

func TestIsUserOwned_RegularFile(t *testing.T) {
	home := t.TempDir()
	t.Setenv("CLAUDE_HOME", home)
	assert.True(t, lib.IsUserOwned(filepath.Join(home, "agents", "my-agent.md")))
}

func TestIsUserOwned_PluginCacheFile(t *testing.T) {
	home := t.TempDir()
	t.Setenv("CLAUDE_HOME", home)
	pluginFile := filepath.Join(home, "plugins", "cache", "some-plugin", "file.md")
	assert.False(t, lib.IsUserOwned(pluginFile))
}

func TestIsUserOwned_PluginCacheDirItself(t *testing.T) {
	home := t.TempDir()
	t.Setenv("CLAUDE_HOME", home)
	cacheDir := filepath.Join(home, "plugins", "cache")
	assert.False(t, lib.IsUserOwned(cacheDir))
}
