package lib_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"fieldstation/lib"
)

func TestResolveAuthToken_EnvVar(t *testing.T) {
	claudeHome := t.TempDir()
	t.Setenv("FIELD_STATION_TOKEN", "from-env")
	got := lib.ResolveAuthToken(claudeHome)
	if got != "from-env" {
		t.Fatalf("expected from-env, got %q", got)
	}
}

func TestResolveAuthToken_ReadsExistingFile(t *testing.T) {
	claudeHome := t.TempDir()
	t.Setenv("FIELD_STATION_TOKEN", "")

	tokenFile := filepath.Join(claudeHome, "field-station-token")
	if err := os.WriteFile(tokenFile, []byte("from-file\n"), 0o600); err != nil {
		t.Fatal(err)
	}

	got := lib.ResolveAuthToken(claudeHome)
	if got != "from-file" {
		t.Fatalf("expected from-file, got %q", got)
	}
}

func TestResolveAuthToken_GeneratesAndWritesFile(t *testing.T) {
	claudeHome := t.TempDir()
	t.Setenv("FIELD_STATION_TOKEN", "")

	got := lib.ResolveAuthToken(claudeHome)
	if got == "" {
		t.Fatal("expected a generated token, got empty string")
	}

	// Must be hex (40 chars = 20 bytes)
	if len(got) != 40 {
		t.Fatalf("expected 40-char hex token, got %d chars: %q", len(got), got)
	}
	for _, c := range got {
		if !strings.ContainsRune("0123456789abcdef", c) {
			t.Fatalf("token contains non-hex char %q: %q", c, got)
		}
	}

	// File must exist with matching content
	tokenFile := filepath.Join(claudeHome, "field-station-token")
	data, err := os.ReadFile(tokenFile)
	if err != nil {
		t.Fatalf("token file not written: %v", err)
	}
	if strings.TrimSpace(string(data)) != got {
		t.Fatalf("file content %q != token %q", string(data), got)
	}
}

func TestResolveAuthToken_TrimsWhitespace(t *testing.T) {
	claudeHome := t.TempDir()
	t.Setenv("FIELD_STATION_TOKEN", "")

	tokenFile := filepath.Join(claudeHome, "field-station-token")
	if err := os.WriteFile(tokenFile, []byte("  my-token  \n"), 0o600); err != nil {
		t.Fatal(err)
	}

	got := lib.ResolveAuthToken(claudeHome)
	if got != "my-token" {
		t.Fatalf("expected trimmed token, got %q", got)
	}
}

func TestResolveAuthToken_GeneratedFileMode(t *testing.T) {
	claudeHome := t.TempDir()
	t.Setenv("FIELD_STATION_TOKEN", "")

	lib.ResolveAuthToken(claudeHome)

	tokenFile := filepath.Join(claudeHome, "field-station-token")
	info, err := os.Stat(tokenFile)
	if err != nil {
		t.Fatalf("token file not found: %v", err)
	}
	if mode := info.Mode().Perm(); mode != 0o600 {
		t.Fatalf("expected mode 0600, got %04o", mode)
	}
}
