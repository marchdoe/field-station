package lib

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

// envVarPrefixPattern mirrors the TypeScript grep:
// grep -E "^(CLAUDE_CODE_|DISABLE_)[A-Z0-9_]+$"
var envVarPrefixPattern = regexp.MustCompile(`^(CLAUDE_CODE_|DISABLE_)[A-Z0-9_]+$`)

// versionLeadPattern extracts a leading numeric version like "1.2.34" from output.
var versionLeadPattern = regexp.MustCompile(`^([\d.]+)`)

// LocateClaudeBinary finds the claude binary on PATH, resolving symlinks.
// Returns an error if claude is not found.
func LocateClaudeBinary() (string, error) {
	p, err := exec.LookPath("claude")
	if err != nil {
		return "", fmt.Errorf("claude binary not found on PATH: %w", err)
	}

	// Attempt to resolve symlinks (mirrors TypeScript's realpath/readlink).
	resolved, err := filepath.EvalSymlinks(p)
	if err == nil {
		return resolved, nil
	}
	return p, nil
}

// GetClaudeVersion runs <binaryPath> --version and parses the version string.
// Returns an error if the binary fails or the output does not start with a version number.
// Times out after 3 seconds (matching the TypeScript 3000ms limit).
func GetClaudeVersion(binaryPath string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, binaryPath, "--version") //nolint:gosec
	cmd.Env = os.Environ()

	out, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("running %s --version: %w", binaryPath, err)
	}

	line := strings.TrimSpace(string(out))
	m := versionLeadPattern.FindStringSubmatch(line)
	if m == nil {
		return "", fmt.Errorf("could not parse version from output: %q", line)
	}
	return m[1], nil
}

// maxBinaryScanSize caps the binary size read into memory when scanning for env vars.
// Mirrors the TypeScript maxBuffer: 10 * 1024 * 1024.
const maxBinaryScanSize = 10 * 1024 * 1024

// ScanBinaryForEnvVars reads a binary file and extracts strings that look like
// environment variable names with the CLAUDE_CODE_ or DISABLE_ prefix.
// Returns an error if the file exceeds 10MB. Deduplicates and sorts the results.
func ScanBinaryForEnvVars(binaryPath string) ([]string, error) {
	info, err := os.Stat(binaryPath) // #nosec G304 — caller controls path
	if err != nil {
		return nil, fmt.Errorf("statting binary %s: %w", binaryPath, err)
	}
	if info.Size() > maxBinaryScanSize {
		return nil, fmt.Errorf("binary %s exceeds maximum scan size (%d bytes)", binaryPath, maxBinaryScanSize)
	}

	data, err := os.ReadFile(binaryPath) // #nosec G304 — caller controls path
	if err != nil {
		return nil, fmt.Errorf("reading binary %s: %w", binaryPath, err)
	}

	seen := map[string]struct{}{}
	// Split on null bytes and common string terminators (space, newline, tab, CR).
	// envVarPrefixPattern subsumes the general envVarPattern check, so only one match is needed.
	for _, token := range bytes.FieldsFunc(data, func(r rune) bool {
		return r == 0 || r == '\n' || r == '\r' || r == '\t' || r == ' '
	}) {
		s := string(token)
		if envVarPrefixPattern.MatchString(s) {
			seen[s] = struct{}{}
		}
	}

	result := make([]string, 0, len(seen))
	for k := range seen {
		result = append(result, k)
	}
	sort.Strings(result)
	return result, nil
}

// BinaryScanResult holds the result of a full claude binary scan.
type BinaryScanResult struct {
	Version    *string
	BinaryPath *string
	EnvVars    []string
}

// ScanClaudeBinary locates the claude binary, gets its version, and scans for env vars.
// Fields are nil/empty if the binary is not found or operations fail.
func ScanClaudeBinary() BinaryScanResult {
	result := BinaryScanResult{EnvVars: []string{}}

	binaryPath, err := LocateClaudeBinary()
	if err != nil {
		return result
	}
	result.BinaryPath = &binaryPath

	if version, err := GetClaudeVersion(binaryPath); err == nil && version != "" {
		result.Version = &version
	}

	if envVars, err := ScanBinaryForEnvVars(binaryPath); err == nil {
		result.EnvVars = envVars
	}

	return result
}
