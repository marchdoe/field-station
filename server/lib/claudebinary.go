package lib

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

// envVarPattern matches strings that consist entirely of uppercase letters, digits,
// and underscores, starting with an uppercase letter, with a minimum length of 4.
// Mirroring the TypeScript: /^[A-Z][A-Z0-9_]+$/
var envVarPattern = regexp.MustCompile(`^[A-Z][A-Z0-9_]+$`)

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
func GetClaudeVersion(binaryPath string) (string, error) {
	cmd := exec.Command(binaryPath, "--version") //nolint:gosec
	cmd.Env = os.Environ()

	// Timeout matching TypeScript's 3000ms.
	done := make(chan struct{})
	go func() {
		select {
		case <-time.After(3 * time.Second):
			_ = cmd.Process.Kill()
		case <-done:
		}
	}()

	out, err := cmd.Output()
	close(done)
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

// ScanBinaryForEnvVars reads a binary file and extracts strings that look like
// environment variable names with the CLAUDE_CODE_ or DISABLE_ prefix.
// It deduplicates and sorts the results.
func ScanBinaryForEnvVars(binaryPath string) ([]string, error) {
	data, err := os.ReadFile(binaryPath) // #nosec G304 — caller controls path
	if err != nil {
		return nil, fmt.Errorf("reading binary %s: %w", binaryPath, err)
	}

	seen := map[string]struct{}{}
	// Split on null bytes and other common string terminators (space, newline, tab, carriage return).
	for _, token := range bytes.FieldsFunc(data, func(r rune) bool {
		return r == 0 || r == '\n' || r == '\r' || r == '\t' || r == ' '
	}) {
		s := string(token)
		// Must match the full env var pattern first (all-caps, min length 2 after first char → min 2 total
		// but TypeScript also requires at least one extra char after the leading [A-Z], so min 2 chars.
		// The grep pattern requires at least one char after the prefix, so effective minimum is >len(prefix).
		// We check envVarPattern for valid characters, then envVarPrefixPattern for the required prefix.
		if !envVarPattern.MatchString(s) {
			continue
		}
		if !envVarPrefixPattern.MatchString(s) {
			continue
		}
		seen[s] = struct{}{}
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
	version, err := func() (string, error) {
		bin, err := LocateClaudeBinary()
		if err != nil {
			return "", err
		}
		return GetClaudeVersion(bin)
	}()

	binaryPath, _ := LocateClaudeBinary()

	var envVars []string
	if binaryPath != "" {
		envVars, _ = ScanBinaryForEnvVars(binaryPath)
	}
	if envVars == nil {
		envVars = []string{}
	}

	result := BinaryScanResult{
		EnvVars: envVars,
	}
	if binaryPath != "" {
		result.BinaryPath = &binaryPath
	}
	if err == nil && version != "" {
		result.Version = &version
	}
	return result
}
