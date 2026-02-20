package api

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"

	"fieldstation/lib"
)

// pluginInstallRecord mirrors the JSON structure in installed_plugins.json.
type pluginInstallRecord struct {
	InstallPath string `json:"installPath"`
}

// installedPluginsFile is the top-level structure of installed_plugins.json.
type installedPluginsFile struct {
	Plugins map[string][]pluginInstallRecord `json:"plugins"`
}

// GetPlugins lists all installed plugins from ~/.claude/plugins/installed_plugins.json.
func (h *FieldStationHandler) GetPlugins(ctx context.Context, request GetPluginsRequestObject) (GetPluginsResponseObject, error) {
	pluginsPath := filepath.Join(h.claudeHome, "plugins", "installed_plugins.json")

	data, err := os.ReadFile(pluginsPath)
	if err != nil {
		// Return empty list if file does not exist or cannot be read.
		return GetPlugins200JSONResponse([]PluginFile{}), nil
	}

	var parsed installedPluginsFile
	if err := json.Unmarshal(data, &parsed); err != nil {
		return GetPlugins200JSONResponse([]PluginFile{}), nil
	}

	result := make([]PluginFile, 0, len(parsed.Plugins))
	for id, records := range parsed.Plugins {
		if len(records) == 0 {
			continue
		}
		record := records[0]
		result = append(result, PluginFile{
			Name:        id,
			Path:        record.InstallPath,
			IsUserOwned: lib.IsUserOwned(record.InstallPath),
		})
	}
	return GetPlugins200JSONResponse(result), nil
}
