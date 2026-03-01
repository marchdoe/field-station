package api //nolint:revive // "api" is a meaningful package name for this HTTP handler package

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"fieldstation/lib"
)

// resolveInstructionsDir returns the directory containing CLAUDE.md for the given scope.
// For global scope: claudeHome. For project scope: the decoded project root.
func (h *FieldStationHandler) resolveInstructionsDir(scope string, projectID *string) (string, error) {
	if scope == "project" {
		if projectID == nil || *projectID == "" {
			return "", fmt.Errorf("projectId is required for project scope")
		}
		return resolveProjectPath(h.claudeHome, *projectID)
	}
	return h.claudeHome, nil
}

func readInstructionsFile(path string) InstructionsFile {
	content, err := os.ReadFile(path) //nolint:gosec // path is constructed from a validated project or claude home directory
	if err != nil {
		return InstructionsFile{FilePath: path, Exists: false, Content: nil}
	}
	s := string(content)
	return InstructionsFile{FilePath: path, Exists: true, Content: &s}
}

// GetInstructions returns CLAUDE.md and CLAUDE.local.md for the given scope.
func (h *FieldStationHandler) GetInstructions(_ context.Context, request GetInstructionsRequestObject) (GetInstructionsResponseObject, error) {
	scope := "global"
	if request.Params.Scope != nil {
		scope = string(*request.Params.Scope)
	}

	dir, err := h.resolveInstructionsDir(scope, request.Params.ProjectId)
	if err != nil {
		return nil, err
	}

	main := readInstructionsFile(filepath.Join(dir, "CLAUDE.md"))
	local := readInstructionsFile(filepath.Join(dir, "CLAUDE.local.md"))

	return GetInstructions200JSONResponse(InstructionsResponse{Main: main, Local: local}), nil
}

// UpdateInstructions writes CLAUDE.md or CLAUDE.local.md for the given scope.
func (h *FieldStationHandler) UpdateInstructions(_ context.Context, request UpdateInstructionsRequestObject) (UpdateInstructionsResponseObject, error) {
	if request.Body == nil {
		return nil, fmt.Errorf("request body is required")
	}
	body := request.Body

	scope := "global"
	if body.Scope != nil {
		scope = string(*body.Scope)
	}

	dir, err := h.resolveInstructionsDir(scope, body.ProjectId)
	if err != nil {
		return nil, err
	}

	fileName := "CLAUDE.md"
	if body.File == Local {
		fileName = "CLAUDE.local.md"
	}

	filePath := filepath.Join(dir, fileName)

	// Backup if the file already exists (makes it visible in Change History).
	if _, err := os.Stat(filePath); err == nil {
		lib.BackupFile(filePath, lib.BackupOpUpdate, h.claudeHome)
	}

	if err := os.MkdirAll(dir, 0o750); err != nil {
		return nil, fmt.Errorf("instructions: cannot create directory %s: %w", dir, err)
	}

	if err := lib.WriteFileAtomic(filePath, []byte(body.Content)); err != nil {
		return nil, fmt.Errorf("instructions: write failed: %w", err)
	}

	return UpdateInstructions200JSONResponse(SuccessResponse{Success: true}), nil
}
