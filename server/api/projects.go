package api

import (
	"context"
	"os"
	"path/filepath"

	"fieldstation/lib"
)

// userHomeDir returns the current user's home directory, or "" if unavailable.
func userHomeDir() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return home
}

// GetProjects lists all project directories from ~/.claude/projects/.
// Each entry is a directory whose name is the encoded project path.
func (h *FieldStationHandler) GetProjects(ctx context.Context, request GetProjectsRequestObject) (GetProjectsResponseObject, error) {
	projectsDir := filepath.Join(h.claudeHome, "projects")

	entries, err := os.ReadDir(projectsDir)
	if err != nil {
		// Return empty list if projects dir does not exist or is unreadable.
		return GetProjects200JSONResponse([]ProjectFile{}), nil
	}

	home := userHomeDir()

	result := make([]ProjectFile, 0, len(entries))
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		encoded := entry.Name()
		decoded, err := lib.DecodePath(encoded)
		if err != nil {
			// Skip entries that cannot be decoded.
			continue
		}
		// The home directory encodes to the same path as the global claude home,
		// which would produce a confusing duplicate of the global config view.
		if home != "" && decoded == home {
			continue
		}
		result = append(result, ProjectFile{
			Name: filepath.Base(decoded),
			Path: decoded,
		})
	}
	return GetProjects200JSONResponse(result), nil
}
