package api

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"fieldstation/lib"
)

// memoryDirForProject returns the memory directory path for the given projectId.
// Memory lives at claudeHome/projects/<projectId>/memory/ — the encoded directory
// is used directly (no decoding needed for the memory path itself).
func (h *FieldStationHandler) memoryDirForProject(projectId string) (string, error) {
	// Validate the project is registered by calling resolveProjectPath (discards result).
	if _, err := resolveProjectPath(h.claudeHome, projectId); err != nil {
		return "", err
	}
	return filepath.Join(h.claudeHome, "projects", projectId, "memory"), nil
}

// validateMemoryFilename returns an error if the filename is unsafe:
// must end in .md and contain no path separators or dot-dot sequences.
func validateMemoryFilename(filename string) error {
	if filename == "" || strings.ContainsAny(filename, "/\\") || strings.Contains(filename, "..") {
		return fmt.Errorf("invalid filename %q: must not contain path separators or ..", filename)
	}
	if !strings.HasSuffix(filename, ".md") {
		return fmt.Errorf("invalid filename %q: must end in .md", filename)
	}
	return nil
}

// ListMemory returns all *.md files in the project's memory directory.
func (h *FieldStationHandler) ListMemory(ctx context.Context, request ListMemoryRequestObject) (ListMemoryResponseObject, error) {
	dir, err := h.memoryDirForProject(request.Params.ProjectId)
	if err != nil {
		return nil, err
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		// Dir absent = empty list.
		return ListMemory200JSONResponse([]MemoryFile{}), nil
	}

	result := make([]MemoryFile, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".md") {
			continue
		}
		filePath := filepath.Join(dir, entry.Name())
		content, err := os.ReadFile(filePath)
		if err != nil {
			continue
		}
		result = append(result, MemoryFile{
			Filename: entry.Name(),
			FilePath: filePath,
			Preview:  lib.TruncateBody(string(content), 3),
		})
	}
	return ListMemory200JSONResponse(result), nil
}

// GetMemory returns the full content of a single memory file.
func (h *FieldStationHandler) GetMemory(ctx context.Context, request GetMemoryRequestObject) (GetMemoryResponseObject, error) {
	if err := validateMemoryFilename(request.Filename); err != nil {
		return nil, err
	}
	dir, err := h.memoryDirForProject(request.Params.ProjectId)
	if err != nil {
		return nil, err
	}
	filePath := filepath.Join(dir, request.Filename)
	content, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("memory: file not found: %s", request.Filename)
	}
	return GetMemory200JSONResponse(MemoryDetail{
		Filename: request.Filename,
		FilePath: filePath,
		Content:  string(content),
	}), nil
}

// CreateMemory creates a new memory file.
func (h *FieldStationHandler) CreateMemory(ctx context.Context, request CreateMemoryRequestObject) (CreateMemoryResponseObject, error) {
	if request.Body == nil {
		return nil, fmt.Errorf("request body is required")
	}
	body := request.Body

	if err := validateMemoryFilename(body.Filename); err != nil {
		return nil, err
	}
	dir, err := h.memoryDirForProject(body.ProjectId)
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("memory: cannot create directory: %w", err)
	}
	filePath := filepath.Join(dir, body.Filename)
	if err := lib.WriteFileAtomic(filePath, []byte(body.Content)); err != nil {
		return nil, fmt.Errorf("memory: write failed: %w", err)
	}
	return CreateMemory200JSONResponse(MemoryFile{
		Filename: body.Filename,
		FilePath: filePath,
		Preview:  lib.TruncateBody(body.Content, 3),
	}), nil
}

// UpdateMemory overwrites an existing memory file.
func (h *FieldStationHandler) UpdateMemory(ctx context.Context, request UpdateMemoryRequestObject) (UpdateMemoryResponseObject, error) {
	if request.Body == nil {
		return nil, fmt.Errorf("request body is required")
	}
	if err := validateMemoryFilename(request.Filename); err != nil {
		return nil, err
	}
	dir, err := h.memoryDirForProject(request.Body.ProjectId)
	if err != nil {
		return nil, err
	}
	filePath := filepath.Join(dir, request.Filename)
	// Backup if file exists.
	if _, err := os.Stat(filePath); err == nil {
		lib.BackupFile(filePath, lib.BackupOpUpdate, h.claudeHome)
	}
	if err := lib.WriteFileAtomic(filePath, []byte(request.Body.Content)); err != nil {
		return nil, fmt.Errorf("memory: write failed: %w", err)
	}
	return UpdateMemory200JSONResponse(SuccessResponse{Success: true}), nil
}

// DeleteMemory removes a memory file.
func (h *FieldStationHandler) DeleteMemory(ctx context.Context, request DeleteMemoryRequestObject) (DeleteMemoryResponseObject, error) {
	if err := validateMemoryFilename(request.Filename); err != nil {
		return nil, err
	}
	dir, err := h.memoryDirForProject(request.Params.ProjectId)
	if err != nil {
		return nil, err
	}
	filePath := filepath.Join(dir, request.Filename)
	lib.BackupFile(filePath, lib.BackupOpDelete, h.claudeHome)
	if err := os.Remove(filePath); err != nil {
		return nil, fmt.Errorf("memory: delete failed: %w", err)
	}
	return DeleteMemory200JSONResponse(SuccessResponse{Success: true}), nil
}
