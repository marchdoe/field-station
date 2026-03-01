package lib_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"fieldstation/lib"
)

// helpers

func writeResourceFile(t *testing.T, dir, id, content string) {
	t.Helper()
	require.NoError(t, os.MkdirAll(dir, 0o750))
	require.NoError(t, os.WriteFile(filepath.Join(dir, id+".md"), []byte(content), 0o600))
}

// ResolveResourceDir

func TestResolveResourceDir_Agent(t *testing.T) {
	home := "/fake/home"
	got := lib.ResolveResourceDir(lib.ResourceTypeAgent, home)
	assert.Equal(t, "/fake/home/agents", got)
}

func TestResolveResourceDir_Command(t *testing.T) {
	home := "/fake/home"
	got := lib.ResolveResourceDir(lib.ResourceTypeCommand, home)
	assert.Equal(t, "/fake/home/commands", got)
}

func TestResolveResourceDir_Skill(t *testing.T) {
	home := "/fake/home"
	got := lib.ResolveResourceDir(lib.ResourceTypeSkill, home)
	assert.Equal(t, "/fake/home/skills", got)
}

// ListResources

func TestListResources_Empty(t *testing.T) {
	claudeHome := t.TempDir()
	// agents dir does not exist
	resources, err := lib.ListResources(lib.ResourceTypeAgent, claudeHome)
	require.NoError(t, err)
	assert.Empty(t, resources)
}

func TestListResources_WithFiles(t *testing.T) {
	claudeHome := t.TempDir()
	agentsDir := filepath.Join(claudeHome, "agents")

	writeResourceFile(t, agentsDir, "alpha", "---\nname: Alpha Agent\ndescription: Does alpha things\n---\nBody text.")
	writeResourceFile(t, agentsDir, "beta", "---\nname: Beta Agent\n---\nAnother body.")
	// non-.md file — should be ignored
	require.NoError(t, os.WriteFile(filepath.Join(agentsDir, "readme.txt"), []byte("ignore me"), 0o600))

	resources, err := lib.ListResources(lib.ResourceTypeAgent, claudeHome)
	require.NoError(t, err)
	require.Len(t, resources, 2)

	// sorted by filename: alpha before beta
	assert.Equal(t, "alpha", resources[0].ID)
	assert.Equal(t, "Alpha Agent", resources[0].Name)
	assert.Equal(t, "Does alpha things", resources[0].Description)
	assert.Equal(t, "Body text.", resources[0].Body)
	assert.Equal(t, filepath.Join(agentsDir, "alpha.md"), resources[0].FilePath)

	assert.Equal(t, "beta", resources[1].ID)
	assert.Equal(t, "Beta Agent", resources[1].Name)
	assert.Equal(t, "", resources[1].Description) // no description field
}

func TestListResources_NameFallsBackToID(t *testing.T) {
	claudeHome := t.TempDir()
	agentsDir := filepath.Join(claudeHome, "agents")
	// no frontmatter name field
	writeResourceFile(t, agentsDir, "my-agent", "Just plain content without frontmatter.")

	resources, err := lib.ListResources(lib.ResourceTypeAgent, claudeHome)
	require.NoError(t, err)
	require.Len(t, resources, 1)
	assert.Equal(t, "my-agent", resources[0].ID)
	assert.Equal(t, "my-agent", resources[0].Name) // fallback to ID
}

// GetResource

func TestGetResource_Found(t *testing.T) {
	claudeHome := t.TempDir()
	agentsDir := filepath.Join(claudeHome, "agents")
	writeResourceFile(t, agentsDir, "my-agent", "---\nname: My Agent\ndescription: Helpful\n---\nDoes stuff.")

	rf, err := lib.GetResource(lib.ResourceTypeAgent, "my-agent", claudeHome)
	require.NoError(t, err)
	assert.Equal(t, "my-agent", rf.ID)
	assert.Equal(t, "My Agent", rf.Name)
	assert.Equal(t, "Helpful", rf.Description)
	assert.Equal(t, "Does stuff.", rf.Body)
	assert.Equal(t, filepath.Join(agentsDir, "my-agent.md"), rf.FilePath)
	assert.NotNil(t, rf.Frontmatter)
}

func TestGetResource_NotFound(t *testing.T) {
	claudeHome := t.TempDir()
	_, err := lib.GetResource(lib.ResourceTypeAgent, "nonexistent", claudeHome)
	require.Error(t, err)
}

// CreateResource

func TestCreateResource_Success(t *testing.T) {
	claudeHome := t.TempDir()
	content := "---\nname: New Agent\n---\nHello."

	rf, err := lib.CreateResource(lib.ResourceTypeAgent, "new-agent", content, claudeHome)
	require.NoError(t, err)
	assert.Equal(t, "new-agent", rf.ID)
	assert.Equal(t, "New Agent", rf.Name)
	assert.Equal(t, "Hello.", rf.Body)

	// verify file exists on disk
	filePath := filepath.Join(claudeHome, "agents", "new-agent.md")
	assert.FileExists(t, filePath)
	data, err := os.ReadFile(filePath) //nolint:gosec // filePath is a controlled temp path in tests
	require.NoError(t, err)
	assert.Equal(t, content, string(data))
}

func TestCreateResource_AlreadyExists(t *testing.T) {
	claudeHome := t.TempDir()
	agentsDir := filepath.Join(claudeHome, "agents")
	writeResourceFile(t, agentsDir, "existing", "# existing")

	_, err := lib.CreateResource(lib.ResourceTypeAgent, "existing", "new content", claudeHome)
	require.Error(t, err)
}

func TestCreateResource_CreatesDirectoryIfNeeded(t *testing.T) {
	claudeHome := t.TempDir()
	// commands dir does not exist yet
	_, err := lib.CreateResource(lib.ResourceTypeCommand, "my-cmd", "# cmd", claudeHome)
	require.NoError(t, err)
	assert.FileExists(t, filepath.Join(claudeHome, "commands", "my-cmd.md"))
}

// UpdateResource

func TestUpdateResource_Success(t *testing.T) {
	claudeHome := t.TempDir()
	agentsDir := filepath.Join(claudeHome, "agents")
	writeResourceFile(t, agentsDir, "updatable", "---\nname: Old Name\n---\nOld body.")

	newContent := "---\nname: New Name\n---\nNew body."
	rf, err := lib.UpdateResource(lib.ResourceTypeAgent, "updatable", newContent, claudeHome)
	require.NoError(t, err)
	assert.Equal(t, "New Name", rf.Name)
	assert.Equal(t, "New body.", rf.Body)

	// verify file was updated on disk
	data, err := os.ReadFile(filepath.Join(agentsDir, "updatable.md")) //nolint:gosec // path is a controlled temp path in tests
	require.NoError(t, err)
	assert.Equal(t, newContent, string(data))

	// verify a backup was created
	backups := lib.ListBackups(claudeHome)
	assert.NotEmpty(t, backups)
}

func TestUpdateResource_NotFound(t *testing.T) {
	claudeHome := t.TempDir()
	_, err := lib.UpdateResource(lib.ResourceTypeAgent, "ghost", "content", claudeHome)
	require.Error(t, err)
}

// DeleteResource

func TestDeleteResource_Success(t *testing.T) {
	claudeHome := t.TempDir()
	agentsDir := filepath.Join(claudeHome, "agents")
	writeResourceFile(t, agentsDir, "deletable", "# bye")

	filePath := filepath.Join(agentsDir, "deletable.md")
	require.FileExists(t, filePath)

	err := lib.DeleteResource(lib.ResourceTypeAgent, "deletable", claudeHome)
	require.NoError(t, err)

	// file should be gone
	assert.NoFileExists(t, filePath)

	// backup should exist
	backups := lib.ListBackups(claudeHome)
	assert.NotEmpty(t, backups)
}

func TestDeleteResource_NotFound(t *testing.T) {
	claudeHome := t.TempDir()
	err := lib.DeleteResource(lib.ResourceTypeAgent, "ghost", claudeHome)
	require.Error(t, err)
}

// Path traversal protection

func TestGetResource_PathTraversal(t *testing.T) {
	claudeHome := t.TempDir()
	_, err := lib.GetResource(lib.ResourceTypeAgent, "../escape", claudeHome)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid resource id")
}

func TestCreateResource_PathTraversalDotDot(t *testing.T) {
	claudeHome := t.TempDir()
	_, err := lib.CreateResource(lib.ResourceTypeAgent, "../escape", "content", claudeHome)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid resource id")
}

func TestCreateResource_PathTraversalSlash(t *testing.T) {
	claudeHome := t.TempDir()
	_, err := lib.CreateResource(lib.ResourceTypeAgent, "sub/dir", "content", claudeHome)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid resource id")
}

func TestUpdateResource_PathTraversal(t *testing.T) {
	claudeHome := t.TempDir()
	_, err := lib.UpdateResource(lib.ResourceTypeAgent, "../../etc/evil", "bad", claudeHome)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid resource id")
}

func TestDeleteResource_PathTraversal(t *testing.T) {
	claudeHome := t.TempDir()
	err := lib.DeleteResource(lib.ResourceTypeAgent, "../escape", claudeHome)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid resource id")
}
