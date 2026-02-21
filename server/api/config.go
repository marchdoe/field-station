package api

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"

	"fieldstation/lib"
)

// GetConfig returns the merged configuration with all layers.
func (h *FieldStationHandler) GetConfig(ctx context.Context, request GetConfigRequestObject) (GetConfigResponseObject, error) {
	projectPath := ""
	if request.Params.ProjectId != nil && *request.Params.ProjectId != "" {
		pp, err := resolveProjectPath(h.claudeHome, *request.Params.ProjectId)
		if err != nil {
			return nil, fmt.Errorf("config: invalid project id: %w", err)
		}
		projectPath = pp
	}

	result := lib.MergeConfigLayers(projectPath)

	apiLayers := make([]ConfigLayer, len(result.Layers))
	for i, layer := range result.Layers {
		var content *map[string]interface{}
		if layer.Content != nil {
			c := map[string]interface{}(layer.Content)
			content = &c
		}
		apiLayers[i] = ConfigLayer{
			Source:   ConfigLayerSource(layer.Source),
			FilePath: layer.FilePath,
			Exists:   layer.Exists,
			Content:  content,
		}
	}

	merged := map[string]interface{}(result.Merged)
	if merged == nil {
		merged = map[string]interface{}{}
	}

	return GetConfig200JSONResponse(ConfigResponse{
		Layers: apiLayers,
		Merged: merged,
	}), nil
}

// resolveConfigFilePath resolves the correct settings.json path based on optional
// decoded projectPath. If projectPath is non-empty, returns the project settings
// file path; otherwise returns the global settings file path.
func (h *FieldStationHandler) resolveConfigFilePath(projectPath *string) (string, error) {
	if projectPath != nil && *projectPath != "" {
		return filepath.Join(*projectPath, ".claude", "settings.json"), nil
	}
	return filepath.Join(h.claudeHome, "settings.json"), nil
}

// UpdateConfigSetting updates a setting in the appropriate settings.json.
func (h *FieldStationHandler) UpdateConfigSetting(ctx context.Context, request UpdateConfigSettingRequestObject) (UpdateConfigSettingResponseObject, error) {
	if request.Body == nil {
		return nil, fmt.Errorf("request body is required")
	}

	var decodedPath *string
	if request.Body.ProjectId != nil && *request.Body.ProjectId != "" {
		pp, err := resolveProjectPath(h.claudeHome, *request.Body.ProjectId)
		if err != nil {
			return nil, err
		}
		decodedPath = &pp
	}

	filePath, err := h.resolveConfigFilePath(decodedPath)
	if err != nil {
		return nil, err
	}

	keyPath := strings.Join(request.Body.KeyPath, ".")

	if err := lib.ApplyUpdateSetting(filePath, keyPath, request.Body.Value, h.claudeHome); err != nil {
		return nil, err
	}

	return UpdateConfigSetting200JSONResponse(SuccessResponse{Success: true}), nil
}

// DeleteConfigSetting deletes a setting from the appropriate settings.json.
func (h *FieldStationHandler) DeleteConfigSetting(ctx context.Context, request DeleteConfigSettingRequestObject) (DeleteConfigSettingResponseObject, error) {
	if request.Body == nil {
		return nil, fmt.Errorf("request body is required")
	}

	var decodedPath *string
	if request.Body.ProjectId != nil && *request.Body.ProjectId != "" {
		pp, err := resolveProjectPath(h.claudeHome, *request.Body.ProjectId)
		if err != nil {
			return nil, err
		}
		decodedPath = &pp
	}

	filePath, err := h.resolveConfigFilePath(decodedPath)
	if err != nil {
		return nil, err
	}

	keyPath := strings.Join(request.Body.KeyPath, ".")

	if err := lib.ApplyDeleteSetting(filePath, keyPath, h.claudeHome); err != nil {
		return nil, err
	}

	return DeleteConfigSetting200JSONResponse(SuccessResponse{Success: true}), nil
}

// MoveConfigSetting moves a config setting between base and local settings files.
// When projectId is provided, moves between project-scoped settings files.
func (h *FieldStationHandler) MoveConfigSetting(ctx context.Context, request MoveConfigSettingRequestObject) (MoveConfigSettingResponseObject, error) {
	if request.Body == nil {
		return nil, fmt.Errorf("request body is required")
	}

	var globalPath, localPath string
	if request.Body.ProjectId != nil && *request.Body.ProjectId != "" {
		pp, err := resolveProjectPath(h.claudeHome, *request.Body.ProjectId)
		if err != nil {
			return nil, fmt.Errorf("unsafe project id: %w", err)
		}
		globalPath = filepath.Join(pp, ".claude", "settings.json")
		localPath = filepath.Join(pp, ".claude", "settings.local.json")
	} else {
		globalPath = filepath.Join(h.claudeHome, "settings.json")
		localPath = filepath.Join(h.claudeHome, "settings.local.json")
	}

	keyPath := strings.Join(request.Body.KeyPath, ".")

	var fromPath, toPath string
	switch request.Body.Direction {
	case Up:
		fromPath = globalPath
		toPath = localPath
	case Down:
		fromPath = localPath
		toPath = globalPath
	default:
		return nil, fmt.Errorf("invalid direction: %s", request.Body.Direction)
	}

	if err := lib.ApplyMoveSetting(fromPath, toPath, keyPath, h.claudeHome); err != nil {
		return nil, err
	}

	return MoveConfigSetting200JSONResponse(SuccessResponse{Success: true}), nil
}
