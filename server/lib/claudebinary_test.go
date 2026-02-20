package lib_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"fieldstation/lib"
)

// TestLocateClaudeBinary_NotFound verifies that an empty PATH causes an error.
func TestLocateClaudeBinary_NotFound(t *testing.T) {
	t.Setenv("PATH", "")

	path, err := lib.LocateClaudeBinary()
	if err == nil {
		t.Errorf("expected error when claude not on PATH, got path=%q", path)
	}
}

// TestLocateClaudeBinary_FindsExecutable verifies that a known executable is found.
func TestLocateClaudeBinary_FindsExecutable(t *testing.T) {
	// Use 'sh' as a stand-in — it is always on PATH.
	// We can't easily test for 'claude' in CI, but we can verify the function
	// successfully resolves a binary that exists.
	dir := t.TempDir()
	fakeBin := filepath.Join(dir, "claude")
	if err := os.WriteFile(fakeBin, []byte("#!/bin/sh\necho fake"), 0o755); err != nil {
		t.Fatal(err)
	}

	t.Setenv("PATH", dir+":"+os.Getenv("PATH"))

	path, err := lib.LocateClaudeBinary()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if path == "" {
		t.Fatal("expected non-empty path")
	}
	// The resolved path should end in "claude" (possibly via symlink resolution).
	if !strings.HasSuffix(filepath.Base(path), "claude") {
		t.Errorf("expected path ending in 'claude', got %q", path)
	}
}

// TestGetClaudeVersion_ParsesOutput tests that version output like "1.2.3 ..." is parsed correctly.
func TestGetClaudeVersion_ParsesOutput(t *testing.T) {
	// Use a real binary ('sh -c echo') to produce known version-like output.
	// We write a tiny shell script that outputs a version string.
	dir := t.TempDir()
	fakeBin := filepath.Join(dir, "fakeclaude")
	script := "#!/bin/sh\necho '1.2.34 (build abc)'\n"
	if err := os.WriteFile(fakeBin, []byte(script), 0o755); err != nil {
		t.Fatal(err)
	}

	version, err := lib.GetClaudeVersion(fakeBin)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if version != "1.2.34" {
		t.Errorf("expected version '1.2.34', got %q", version)
	}
}

// TestGetClaudeVersion_NoMatch verifies that output not starting with digits returns an error.
func TestGetClaudeVersion_NoMatch(t *testing.T) {
	dir := t.TempDir()
	fakeBin := filepath.Join(dir, "fakeclaude")
	script := "#!/bin/sh\necho 'something without a version'\n"
	if err := os.WriteFile(fakeBin, []byte(script), 0o755); err != nil {
		t.Fatal(err)
	}

	_, err := lib.GetClaudeVersion(fakeBin)
	if err == nil {
		t.Error("expected error when output doesn't match version pattern")
	}
}

// TestGetClaudeVersion_BinaryFails verifies that a non-zero exit returns an error.
func TestGetClaudeVersion_BinaryFails(t *testing.T) {
	dir := t.TempDir()
	fakeBin := filepath.Join(dir, "fakeclaude")
	script := "#!/bin/sh\nexit 1\n"
	if err := os.WriteFile(fakeBin, []byte(script), 0o755); err != nil {
		t.Fatal(err)
	}

	_, err := lib.GetClaudeVersion(fakeBin)
	if err == nil {
		t.Error("expected error when binary exits non-zero")
	}
}

// TestScanBinaryForEnvVars_MatchesPattern verifies known env var names are detected.
func TestScanBinaryForEnvVars_MatchesPattern(t *testing.T) {
	dir := t.TempDir()
	tmpFile := filepath.Join(dir, "fakebinary")

	// Write content that includes env var names (CLAUDE_CODE_ and DISABLE_ prefixed),
	// separated by null bytes to simulate binary content.
	content := "CLAUDE_CODE_ENABLE_TELEMETRY\x00DISABLE_ERROR_REPORTING\x00ANTHROPIC_API_KEY\x00" +
		"short\x00CLAUDE_CODE_FOO\x00not_valid\x00DISABLE_AUTOUPDATE\x00"
	if err := os.WriteFile(tmpFile, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}

	vars, err := lib.ScanBinaryForEnvVars(tmpFile)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// The function filters for CLAUDE_CODE_ or DISABLE_ prefixed vars.
	expected := map[string]bool{
		"CLAUDE_CODE_ENABLE_TELEMETRY": true,
		"DISABLE_ERROR_REPORTING":      true,
		"CLAUDE_CODE_FOO":              true,
		"DISABLE_AUTOUPDATE":           true,
	}

	found := map[string]bool{}
	for _, v := range vars {
		found[v] = true
	}

	for want := range expected {
		if !found[want] {
			t.Errorf("expected %q in results, got %v", want, vars)
		}
	}

	// ANTHROPIC_API_KEY should NOT appear (no CLAUDE_CODE_ or DISABLE_ prefix).
	if found["ANTHROPIC_API_KEY"] {
		t.Error("ANTHROPIC_API_KEY should not be included — wrong prefix")
	}
}

// TestScanBinaryForEnvVars_ExcludesShortStrings verifies short strings are excluded.
func TestScanBinaryForEnvVars_ExcludesShortStrings(t *testing.T) {
	dir := t.TempDir()
	tmpFile := filepath.Join(dir, "fakebinary")

	// CLD_ is 4 chars but has wrong prefix. AB is 2 chars. CLAUDE_CODE_X is 13 chars.
	content := "AB\x00CLD\x00CLAUDE_CODE_X\x00"
	if err := os.WriteFile(tmpFile, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}

	vars, err := lib.ScanBinaryForEnvVars(tmpFile)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	for _, v := range vars {
		if v == "AB" || v == "CLD" {
			t.Errorf("short string %q should not appear in results", v)
		}
	}

	// CLAUDE_CODE_X should be found
	found := false
	for _, v := range vars {
		if v == "CLAUDE_CODE_X" {
			found = true
		}
	}
	if !found {
		t.Errorf("expected CLAUDE_CODE_X in results, got %v", vars)
	}
}

// TestScanBinaryForEnvVars_Deduplicates verifies duplicates are removed.
func TestScanBinaryForEnvVars_Deduplicates(t *testing.T) {
	dir := t.TempDir()
	tmpFile := filepath.Join(dir, "fakebinary")

	// Repeat the same var multiple times.
	content := "CLAUDE_CODE_FOO\x00CLAUDE_CODE_FOO\x00CLAUDE_CODE_FOO\x00"
	if err := os.WriteFile(tmpFile, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}

	vars, err := lib.ScanBinaryForEnvVars(tmpFile)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	count := 0
	for _, v := range vars {
		if v == "CLAUDE_CODE_FOO" {
			count++
		}
	}
	if count != 1 {
		t.Errorf("expected exactly 1 occurrence of CLAUDE_CODE_FOO, got %d", count)
	}
}

// TestScanBinaryForEnvVars_SortedOutput verifies results are sorted.
func TestScanBinaryForEnvVars_SortedOutput(t *testing.T) {
	dir := t.TempDir()
	tmpFile := filepath.Join(dir, "fakebinary")

	content := "DISABLE_ZZZ\x00CLAUDE_CODE_AAA\x00DISABLE_MMM\x00"
	if err := os.WriteFile(tmpFile, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}

	vars, err := lib.ScanBinaryForEnvVars(tmpFile)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	for i := 1; i < len(vars); i++ {
		if vars[i] < vars[i-1] {
			t.Errorf("results not sorted: %v[%d]=%q < %v[%d]=%q", vars, i, vars[i], vars, i-1, vars[i-1])
		}
	}
}

// TestScanBinaryForEnvVars_MissingFile verifies that a missing file returns an error.
func TestScanBinaryForEnvVars_MissingFile(t *testing.T) {
	_, err := lib.ScanBinaryForEnvVars("/nonexistent/path/to/binary")
	if err == nil {
		t.Error("expected error for missing file")
	}
}

// TestScanClaudeBinary_ReturnsStruct verifies ScanClaudeBinary returns a populated struct.
func TestScanClaudeBinary_ReturnsStruct(t *testing.T) {
	dir := t.TempDir()

	// Write a fake claude binary that outputs a version string.
	fakeBin := filepath.Join(dir, "claude")
	script := "#!/bin/sh\necho '9.8.7'\n"
	if err := os.WriteFile(fakeBin, []byte(script), 0o755); err != nil {
		t.Fatal(err)
	}

	t.Setenv("PATH", dir+":"+os.Getenv("PATH"))

	result := lib.ScanClaudeBinary()

	if result.Version == nil || *result.Version != "9.8.7" {
		t.Errorf("expected version '9.8.7', got %v", result.Version)
	}
	if result.BinaryPath == nil || *result.BinaryPath == "" {
		t.Errorf("expected non-nil BinaryPath, got %v", result.BinaryPath)
	}
	// EnvVars should be a non-nil slice (possibly empty for the script).
	if result.EnvVars == nil {
		t.Error("expected non-nil EnvVars slice")
	}
}

// TestScanClaudeBinary_NoBinaryOnPath verifies zero-value result when claude is absent.
func TestScanClaudeBinary_NoBinaryOnPath(t *testing.T) {
	t.Setenv("PATH", "")

	result := lib.ScanClaudeBinary()

	if result.Version != nil {
		t.Errorf("expected nil Version when binary not found, got %q", *result.Version)
	}
	if result.BinaryPath != nil {
		t.Errorf("expected nil BinaryPath when binary not found, got %q", *result.BinaryPath)
	}
	if result.EnvVars == nil {
		t.Error("expected non-nil EnvVars slice (empty)")
	}
	if len(result.EnvVars) != 0 {
		t.Errorf("expected empty EnvVars, got %v", result.EnvVars)
	}
}
