package api_test

import (
	"context"
	"path/filepath"
	"testing"

	"fieldstation/api"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSearch_EmptyQuery_ReturnsAll(t *testing.T) {
	h, claudeHome := newTestHandler(t)

	// Create one agent and one command.
	agentDir := filepath.Join(claudeHome, "agents")
	writeAgentFile(t, agentDir, "myagent", "---\nname: My Agent\n---\nBody")
	commandDir := filepath.Join(claudeHome, "commands")
	writeCommandFile(t, commandDir, "myfolder", "mycmd", "# Command body")

	q := ""
	resp, err := h.Search(context.Background(), api.SearchRequestObject{
		Params: api.SearchParams{Q: q},
	})
	require.NoError(t, err)
	result, ok := resp.(api.Search200JSONResponse)
	require.True(t, ok)
	assert.GreaterOrEqual(t, len(result), 2, "empty query should return all resources")
}

func TestSearch_FilteredQuery_ReturnsMatches(t *testing.T) {
	h, claudeHome := newTestHandler(t)

	agentDir := filepath.Join(claudeHome, "agents")
	writeAgentFile(t, agentDir, "special-agent", "---\nname: Special Agent\ndescription: unique-keyword\n---\nBody")
	writeAgentFile(t, agentDir, "other-agent", "---\nname: Other Agent\n---\nBody")

	q := "unique-keyword"
	resp, err := h.Search(context.Background(), api.SearchRequestObject{
		Params: api.SearchParams{Q: q},
	})
	require.NoError(t, err)
	result, ok := resp.(api.Search200JSONResponse)
	require.True(t, ok)
	require.Len(t, result, 1, "only the matching agent should be returned")
	assert.Equal(t, "Special Agent", result[0].Name)
}

func TestSearch_NoMatches_ReturnsEmpty(t *testing.T) {
	h, _ := newTestHandler(t)

	q := "xyzzy-no-match"
	resp, err := h.Search(context.Background(), api.SearchRequestObject{
		Params: api.SearchParams{Q: q},
	})
	require.NoError(t, err)
	result, ok := resp.(api.Search200JSONResponse)
	require.True(t, ok)
	assert.Empty(t, result)
}
