package api

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"fieldstation/lib"
)

// resolveCommandDir returns the root commands directory for the given scope.
func (h *FieldStationHandler) resolveCommandDir(scope string, projectPath *string) (string, error) {
	if scope == "project" {
		if projectPath == nil || *projectPath == "" {
			return "", fmt.Errorf("projectPath is required for project scope")
		}
		return filepath.Join(*projectPath, ".claude", "commands"), nil
	}
	return filepath.Join(h.claudeHome, "commands"), nil
}

// listCommandsFromDir reads all commands from the directory, which stores
// commands as <dir>/<folder>/<name>.md files.
func listCommandsFromDir(dir string) ([]CommandFile, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return []CommandFile{}, nil
		}
		return nil, fmt.Errorf("commands: cannot read dir %s: %w", dir, err)
	}

	var commands []CommandFile
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		folderName := entry.Name()
		folderPath := filepath.Join(dir, folderName)

		mdEntries, err := os.ReadDir(folderPath)
		if err != nil {
			continue
		}
		for _, mdEntry := range mdEntries {
			if mdEntry.IsDir() || !strings.HasSuffix(mdEntry.Name(), ".md") {
				continue
			}
			filePath := filepath.Join(folderPath, mdEntry.Name())
			name := strings.TrimSuffix(mdEntry.Name(), ".md")

			data, err := os.ReadFile(filePath)
			if err != nil {
				continue
			}
			commands = append(commands, CommandFile{
				Name:        name,
				FileName:    mdEntry.Name(),
				FilePath:    filePath,
				Folder:      folderName,
				BodyPreview: lib.TruncateBody(string(data), 5),
				IsEditable:  lib.IsUserOwned(filePath),
			})
		}
	}
	return commands, nil
}

// GetCommands lists all command files for the given scope.
func (h *FieldStationHandler) GetCommands(ctx context.Context, request GetCommandsRequestObject) (GetCommandsResponseObject, error) {
	scope := "global"
	if request.Params.Scope != nil {
		scope = string(*request.Params.Scope)
	}

	commandDir, err := h.resolveCommandDir(scope, request.Params.ProjectPath)
	if err != nil {
		return nil, err
	}

	commands, err := listCommandsFromDir(commandDir)
	if err != nil {
		return nil, err
	}
	if commands == nil {
		commands = []CommandFile{}
	}
	return GetCommands200JSONResponse(commands), nil
}

// GetCommand returns the detail of a single command by scope, folder, and name.
func (h *FieldStationHandler) GetCommand(ctx context.Context, request GetCommandRequestObject) (GetCommandResponseObject, error) {
	commandDir, err := h.resolveCommandDir(request.Scope, request.Params.ProjectPath)
	if err != nil {
		return nil, err
	}

	filePath := filepath.Join(commandDir, request.Folder, request.Name+".md")

	// Validate that the resolved path stays within the commands directory.
	if _, err := lib.AssertSafePath(filePath, []string{commandDir}); err != nil {
		return nil, fmt.Errorf("commands: unsafe path: %w", err)
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("command not found: %s/%s", request.Folder, request.Name)
		}
		return nil, fmt.Errorf("commands: cannot read %s: %w", filePath, err)
	}

	return GetCommand200JSONResponse(CommandDetail{
		Name:       request.Name,
		FileName:   request.Name + ".md",
		FilePath:   filePath,
		Folder:     request.Folder,
		Body:       string(data),
		IsEditable: lib.IsUserOwned(filePath),
	}), nil
}

// CreateCommand creates a new command file inside the specified folder.
func (h *FieldStationHandler) CreateCommand(ctx context.Context, request CreateCommandRequestObject) (CreateCommandResponseObject, error) {
	if request.Body == nil {
		return nil, fmt.Errorf("request body is required")
	}
	body := request.Body

	commandDir, err := h.resolveCommandDir(string(body.Scope), body.ProjectPath)
	if err != nil {
		return nil, err
	}

	folderPath := filepath.Join(commandDir, body.Folder)
	filePath := filepath.Join(folderPath, body.Name+".md")

	if _, err := lib.AssertSafePath(filePath, []string{commandDir}); err != nil {
		return nil, fmt.Errorf("commands: unsafe path: %w", err)
	}

	if !lib.IsUserOwned(filePath) {
		return nil, fmt.Errorf("commands: cannot write plugin-managed file: %s", filePath)
	}

	if err := os.MkdirAll(folderPath, 0o755); err != nil {
		return nil, fmt.Errorf("commands: cannot create folder %s: %w", folderPath, err)
	}

	// Fail if file already exists (atomic create).
	f, err := os.OpenFile(filePath, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o644)
	if err != nil {
		if os.IsExist(err) {
			return nil, fmt.Errorf("commands: command already exists: %s/%s", body.Folder, body.Name)
		}
		return nil, fmt.Errorf("commands: cannot create %s: %w", filePath, err)
	}
	if _, werr := f.WriteString(body.Body); werr != nil {
		f.Close()
		os.Remove(filePath)
		return nil, fmt.Errorf("commands: cannot write %s: %w", filePath, werr)
	}
	if err := f.Close(); err != nil {
		os.Remove(filePath)
		return nil, fmt.Errorf("commands: cannot close %s: %w", filePath, err)
	}

	return CreateCommand200JSONResponse(CommandFile{
		Name:        body.Name,
		FileName:    body.Name + ".md",
		FilePath:    filePath,
		Folder:      body.Folder,
		BodyPreview: lib.TruncateBody(body.Body, 5),
		IsEditable:  lib.IsUserOwned(filePath),
	}), nil
}

// UpdateCommand updates an existing command file.
func (h *FieldStationHandler) UpdateCommand(ctx context.Context, request UpdateCommandRequestObject) (UpdateCommandResponseObject, error) {
	if request.Body == nil {
		return nil, fmt.Errorf("request body is required")
	}
	body := request.Body

	commandDir, err := h.resolveCommandDir(request.Scope, body.ProjectPath)
	if err != nil {
		return nil, err
	}

	filePath := filepath.Join(commandDir, request.Folder, request.Name+".md")

	// Validate path is under an allowed root.
	if _, err := lib.AssertSafePath(filePath, lib.GetAllowedRoots("")); err != nil {
		return nil, err
	}

	// Backup before mutation.
	lib.BackupFile(filePath, lib.BackupOpUpdate, h.claudeHome)

	if err := lib.WriteFileAtomic(filePath, []byte(body.Body)); err != nil {
		return nil, fmt.Errorf("commands: cannot write %s: %w", filePath, err)
	}

	return UpdateCommand200JSONResponse(CommandDetail{
		Name:       request.Name,
		FileName:   request.Name + ".md",
		FilePath:   filePath,
		Folder:     request.Folder,
		Body:       body.Body,
		IsEditable: lib.IsUserOwned(filePath),
	}), nil
}

// DeleteCommand deletes a command file.
func (h *FieldStationHandler) DeleteCommand(ctx context.Context, request DeleteCommandRequestObject) (DeleteCommandResponseObject, error) {
	commandDir, err := h.resolveCommandDir(request.Scope, request.Params.ProjectPath)
	if err != nil {
		return nil, err
	}

	filePath := filepath.Join(commandDir, request.Folder, request.Name+".md")

	// Validate path safety.
	if _, err := lib.AssertSafePath(filePath, lib.GetAllowedRoots("")); err != nil {
		return nil, err
	}

	if _, err := os.Stat(filePath); err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("command not found: %s/%s", request.Folder, request.Name)
		}
		return nil, fmt.Errorf("commands: cannot stat %s: %w", filePath, err)
	}

	lib.BackupFile(filePath, lib.BackupOpDelete, h.claudeHome)

	if err := os.Remove(filePath); err != nil {
		return nil, fmt.Errorf("commands: cannot delete %s: %w", filePath, err)
	}
	return DeleteCommand200JSONResponse(SuccessResponse{Success: true}), nil
}
