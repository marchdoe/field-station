package api_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"fieldstation/api"
	"github.com/stretchr/testify/require"
)

func TestResolveProjectPath_RegisteredProject(t *testing.T) {
	claudeHome := t.TempDir()
	// Use a known project path and its encoding
	projectPath := t.TempDir()
	// Encode the path: strip leading slash, replace slashes with dashes
	withoutSlash := strings.TrimPrefix(projectPath, "/")
	encoded := "-" + strings.ReplaceAll(withoutSlash, "/", "-")
	// Register it (create the directory in claudeHome/projects/)
	require.NoError(t, os.MkdirAll(filepath.Join(claudeHome, "projects", encoded), 0o755))

	got, err := api.ExportedResolveProjectPath(claudeHome, encoded)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != projectPath {
		t.Fatalf("expected %q, got %q", projectPath, got)
	}
}

func TestResolveProjectPath_UnregisteredID(t *testing.T) {
	claudeHome := t.TempDir()
	_, err := api.ExportedResolveProjectPath(claudeHome, "-unregistered-project")
	if err == nil {
		t.Fatal("expected error for unregistered project ID, got nil")
	}
}

func TestResolveProjectPath_EmptyID(t *testing.T) {
	claudeHome := t.TempDir()
	_, err := api.ExportedResolveProjectPath(claudeHome, "")
	if err == nil {
		t.Fatal("expected error for empty project ID, got nil")
	}
}
