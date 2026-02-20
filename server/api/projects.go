package api

import (
	"context"
	"os"
	"path/filepath"

	"fieldstation/lib"
)

// GetProjects lists all project directories from ~/.claude/projects/.
// Each entry is a directory whose name is the encoded project path.
func (h *FieldStationHandler) GetProjects(ctx context.Context, request GetProjectsRequestObject) (GetProjectsResponseObject, error) {
	projectsDir := filepath.Join(h.claudeHome, "projects")

	entries, err := os.ReadDir(projectsDir)
	if err != nil {
		// Return empty list if projects dir does not exist or is unreadable.
		return GetProjects200JSONResponse([]ProjectFile{}), nil
	}

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
		result = append(result, ProjectFile{
			Name: filepath.Base(decoded),
			Path: decoded,
		})
	}
	return GetProjects200JSONResponse(result), nil
}
