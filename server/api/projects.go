package api //nolint:revive // "api" is a meaningful package name for this HTTP handler package

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

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
func (h *FieldStationHandler) GetProjects(_ context.Context, _ GetProjectsRequestObject) (GetProjectsResponseObject, error) {
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
	// Filter out ancestor paths: if path A is a strict prefix of path B, skip A.
	filtered := result[:0]
	for _, p := range result {
		isAncestor := false
		for _, q := range result {
			if p.Path != q.Path && strings.HasPrefix(q.Path, p.Path+"/") {
				isAncestor = true
				break
			}
		}
		if !isAncestor {
			filtered = append(filtered, p)
		}
	}
	return GetProjects200JSONResponse(filtered), nil
}

// PostProjects batch-registers one or more project paths under ~/.claude/projects/.
func (h *FieldStationHandler) PostProjects(_ context.Context, req PostProjectsRequestObject) (PostProjectsResponseObject, error) {
	var result []ProjectFile
	for _, rawPath := range req.Body.Paths {
		path := filepath.Clean(rawPath)
		if path == "" || path == "." {
			continue
		}
		info, err := os.Stat(path)
		if err != nil || !info.IsDir() {
			return PostProjects400JSONResponse{Error: fmt.Sprintf("not a directory: %s", rawPath)}, nil
		}
		encoded := lib.EncodePath(path)
		entry := filepath.Join(h.claudeHome, "projects", encoded)
		if err := os.MkdirAll(entry, 0o750); err != nil {
			return PostProjects400JSONResponse{Error: "failed to register project"}, nil
		}
		result = append(result, ProjectFile{Name: filepath.Base(path), Path: path})
	}
	if result == nil {
		result = []ProjectFile{}
	}
	return PostProjects200JSONResponse(result), nil
}

// ScanProjects scans a folder for subdirectories that contain a .claude/ directory.
func (h *FieldStationHandler) ScanProjects(_ context.Context, req ScanProjectsRequestObject) (ScanProjectsResponseObject, error) {
	folderRaw := req.Params.Folder
	if folderRaw == "" {
		return ScanProjects400JSONResponse{Error: "folder is required"}, nil
	}
	// Expand ~ to the user's home directory.
	if strings.HasPrefix(folderRaw, "~/") {
		home, err := os.UserHomeDir()
		if err != nil {
			return ScanProjects400JSONResponse{Error: "cannot resolve home directory"}, nil
		}
		folderRaw = filepath.Join(home, folderRaw[2:])
	}
	folder := filepath.Clean(folderRaw)

	info, err := os.Stat(folder)
	if err != nil || !info.IsDir() {
		return ScanProjects400JSONResponse{Error: "folder does not exist"}, nil
	}

	entries, err := os.ReadDir(folder)
	if err != nil {
		return ScanProjects400JSONResponse{Error: "cannot read folder"}, nil
	}

	var results []ScanProjectResult
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		projectPath := filepath.Join(folder, entry.Name())
		claudeDir := filepath.Join(projectPath, ".claude")
		if _, err := os.Stat(claudeDir); os.IsNotExist(err) {
			continue
		}
		encoded := lib.EncodePath(projectPath)
		_, regErr := os.Stat(filepath.Join(h.claudeHome, "projects", encoded))
		registered := regErr == nil
		results = append(results, ScanProjectResult{
			Name:       entry.Name(),
			Path:       projectPath,
			Registered: registered,
		})
	}
	if results == nil {
		results = []ScanProjectResult{}
	}
	return ScanProjects200JSONResponse(results), nil
}

// DeleteProject removes a registered project directory from ~/.claude/projects/.
func (h *FieldStationHandler) DeleteProject(_ context.Context, req DeleteProjectRequestObject) (DeleteProjectResponseObject, error) {
	projectID := req.ProjectId

	// A valid encoded path always starts with "-" (the leading "/" becomes "-")
	if !strings.HasPrefix(projectID, "-") {
		return DeleteProject400JSONResponse{Error: "invalid project id"}, nil
	}

	projectDir := filepath.Join(h.claudeHome, "projects", projectID)
	if _, err := os.Stat(projectDir); os.IsNotExist(err) {
		return DeleteProject404JSONResponse{Error: "project not found"}, nil
	}

	if err := os.RemoveAll(projectDir); err != nil {
		return DeleteProject400JSONResponse{Error: "failed to remove project"}, nil
	}

	return DeleteProject204Response{}, nil
}
