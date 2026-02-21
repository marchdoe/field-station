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
	if request.Params.ProjectPath != nil {
		projectPath = *request.Params.ProjectPath
		allowedRoots := lib.GetAllowedRoots("")
		if _, err := lib.AssertSafePath(projectPath, allowedRoots); err != nil {
			return nil, fmt.Errorf("config: unsafe project path: %w", err)
		}
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

// resolveConfigFilePath resolves the correct settings.json path based on optional projectPath.
// If projectPath is provided, validates it and returns the project settings file path.
// Otherwise returns the global settings file path.
func (h *FieldStationHandler) resolveConfigFilePath(projectPath *string) (string, error) {
	if projectPath != nil && *projectPath != "" {
		pp := *projectPath
		allowedRoots := lib.GetAllowedRoots(pp)
		if _, err := lib.AssertSafePath(pp, allowedRoots); err != nil {
			return "", fmt.Errorf("unsafe project path: %w", err)
		}
		return filepath.Join(pp, ".claude", "settings.json"), nil
	}
	return filepath.Join(h.claudeHome, "settings.json"), nil
}

// UpdateConfigSetting updates a setting in the appropriate settings.json.
func (h *FieldStationHandler) UpdateConfigSetting(ctx context.Context, request UpdateConfigSettingRequestObject) (UpdateConfigSettingResponseObject, error) {
	if request.Body == nil {
		return nil, fmt.Errorf("request body is required")
	}

	filePath, err := h.resolveConfigFilePath(request.Body.ProjectPath)
	if err != nil {
		return nil, err
	}

	if _, err := lib.AssertSafePath(filePath, []string{h.claudeHome, filepath.Dir(filePath)}); err != nil {
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

	filePath, err := h.resolveConfigFilePath(request.Body.ProjectPath)
	if err != nil {
		return nil, err
	}

	if _, err := lib.AssertSafePath(filePath, []string{h.claudeHome, filepath.Dir(filePath)}); err != nil {
		return nil, err
	}

	keyPath := strings.Join(request.Body.KeyPath, ".")

	if err := lib.ApplyDeleteSetting(filePath, keyPath, h.claudeHome); err != nil {
		return nil, err
	}

	return DeleteConfigSetting200JSONResponse(SuccessResponse{Success: true}), nil
}

// MoveConfigSetting moves a config setting between base and local settings files.
// When projectPath is provided, moves between project-scoped settings files.
func (h *FieldStationHandler) MoveConfigSetting(ctx context.Context, request MoveConfigSettingRequestObject) (MoveConfigSettingResponseObject, error) {
	if request.Body == nil {
		return nil, fmt.Errorf("request body is required")
	}

	var globalPath, localPath string
	if request.Body.ProjectPath != nil && *request.Body.ProjectPath != "" {
		pp := *request.Body.ProjectPath
		allowedRoots := lib.GetAllowedRoots(pp)
		if _, err := lib.AssertSafePath(pp, allowedRoots); err != nil {
			return nil, fmt.Errorf("unsafe project path: %w", err)
		}
		globalPath = filepath.Join(pp, ".claude", "settings.json")
		localPath = filepath.Join(pp, ".claude", "settings.local.json")
	} else {
		globalPath = filepath.Join(h.claudeHome, "settings.json")
		localPath = filepath.Join(h.claudeHome, "settings.local.json")
	}

	if _, err := lib.AssertSafePath(globalPath, []string{h.claudeHome, filepath.Dir(globalPath)}); err != nil {
		return nil, err
	}
	if _, err := lib.AssertSafePath(localPath, []string{h.claudeHome, filepath.Dir(localPath)}); err != nil {
		return nil, err
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
