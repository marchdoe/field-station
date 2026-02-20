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

// UpdateConfigSetting updates a setting in the global settings.json.
func (h *FieldStationHandler) UpdateConfigSetting(ctx context.Context, request UpdateConfigSettingRequestObject) (UpdateConfigSettingResponseObject, error) {
	if request.Body == nil {
		return nil, fmt.Errorf("request body is required")
	}

	filePath := filepath.Join(h.claudeHome, "settings.json")

	if _, err := lib.AssertSafePath(filePath, []string{h.claudeHome}); err != nil {
		return nil, err
	}

	keyPath := strings.Join(request.Body.KeyPath, ".")

	if err := lib.ApplyUpdateSetting(filePath, keyPath, request.Body.Value, h.claudeHome); err != nil {
		return nil, err
	}

	return UpdateConfigSetting200JSONResponse(SuccessResponse{Success: true}), nil
}

// DeleteConfigSetting deletes a setting from the global settings.json.
func (h *FieldStationHandler) DeleteConfigSetting(ctx context.Context, request DeleteConfigSettingRequestObject) (DeleteConfigSettingResponseObject, error) {
	if request.Body == nil {
		return nil, fmt.Errorf("request body is required")
	}

	filePath := filepath.Join(h.claudeHome, "settings.json")

	if _, err := lib.AssertSafePath(filePath, []string{h.claudeHome}); err != nil {
		return nil, err
	}

	keyPath := strings.Join(request.Body.KeyPath, ".")

	if err := lib.ApplyDeleteSetting(filePath, keyPath, h.claudeHome); err != nil {
		return nil, err
	}

	return DeleteConfigSetting200JSONResponse(SuccessResponse{Success: true}), nil
}

// MoveConfigSetting moves a setting between the global and global-local settings files.
// direction "up" promotes a setting from settings.json to settings.local.json.
// direction "down" demotes a setting from settings.local.json to settings.json.
func (h *FieldStationHandler) MoveConfigSetting(ctx context.Context, request MoveConfigSettingRequestObject) (MoveConfigSettingResponseObject, error) {
	if request.Body == nil {
		return nil, fmt.Errorf("request body is required")
	}

	globalPath := filepath.Join(h.claudeHome, "settings.json")
	localPath := filepath.Join(h.claudeHome, "settings.local.json")

	if _, err := lib.AssertSafePath(globalPath, []string{h.claudeHome}); err != nil {
		return nil, err
	}
	if _, err := lib.AssertSafePath(localPath, []string{h.claudeHome}); err != nil {
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
