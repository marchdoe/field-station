package lib

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// DecodePath decodes a Claude Code project directory name back to a filesystem path.
// Claude Code encodes project paths by replacing the leading '/' with '-' and all
// subsequent '/' characters with '-'. For example, '/Users/foo/bar' becomes '-Users-foo-bar'.
//
// This mirrors the decodePath() function in src/lib/utils.ts:
//
//	export function decodePath(encoded: string): string {
//	  const withoutLeadingDash = encoded.startsWith("-") ? encoded.slice(1) : encoded;
//	  return `/${withoutLeadingDash.replace(/-/g, "/")}`;
//	}
func DecodePath(encoded string) (string, error) {
	if encoded == "" {
		return "", fmt.Errorf("cannot decode empty path")
	}
	withoutLeadingDash := encoded
	if strings.HasPrefix(encoded, "-") {
		withoutLeadingDash = encoded[1:]
	}
	if withoutLeadingDash == "" {
		return "", fmt.Errorf("cannot decode path: decoded to empty string")
	}
	return "/" + strings.ReplaceAll(withoutLeadingDash, "-", "/"), nil
}

// AssertSafePath resolves rawPath and verifies it is under one of allowedRoots.
// Returns the resolved absolute path, or an error if outside allowed roots.
func AssertSafePath(rawPath string, allowedRoots []string) (string, error) {
	if rawPath == "" {
		return "", fmt.Errorf("path must not be empty")
	}

	resolved, err := filepath.Abs(rawPath)
	if err != nil {
		return "", fmt.Errorf("path resolution failed: %w", err)
	}

	for _, root := range allowedRoots {
		resolvedRoot, err := filepath.Abs(root)
		if err != nil {
			continue
		}
		if resolved == resolvedRoot || strings.HasPrefix(resolved, resolvedRoot+string(filepath.Separator)) {
			return resolved, nil
		}
	}

	return "", fmt.Errorf("path is outside allowed directories: %s", resolved)
}

// GetAllowedRoots returns the list of filesystem roots that paths may be validated against.
// Always includes the Claude home directory; also includes project paths from dataFilePath
// (a JSON array of path strings) and ~/.claude/projects/ subdirectories.
func GetAllowedRoots(dataFilePath string) []string {
	claudeHome := ResolveClaudeHome()
	seen := map[string]struct{}{}

	addPath := func(p string) {
		if abs, err := filepath.Abs(p); err == nil {
			seen[abs] = struct{}{}
		}
	}
	addPath(claudeHome)

	// Projects registered in data file (JSON array of strings)
	if data, err := os.ReadFile(dataFilePath); err == nil {
		var paths []string
		if err := json.Unmarshal(data, &paths); err == nil {
			for _, p := range paths {
				if p != "" {
					addPath(p)
				}
			}
		}
	}

	// Projects from ~/.claude/projects/ directory entries (encoded path names)
	projectsDir := filepath.Join(claudeHome, "projects")
	if entries, err := os.ReadDir(projectsDir); err == nil {
		for _, entry := range entries {
			if entry.IsDir() {
				if decoded, err := DecodePath(entry.Name()); err == nil {
					addPath(decoded)
				}
			}
		}
	}

	roots := make([]string, 0, len(seen))
	for k := range seen {
		roots = append(roots, k)
	}
	return roots
}
