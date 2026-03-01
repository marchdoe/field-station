package lib

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// ConfigLayerSource identifies which configuration layer a file belongs to.
type ConfigLayerSource string

// Config layer source constants used to identify which settings file a layer belongs to.
const (
	ConfigLayerGlobal       ConfigLayerSource = "global"
	ConfigLayerGlobalLocal  ConfigLayerSource = "global-local"
	ConfigLayerProject      ConfigLayerSource = "project"
	ConfigLayerProjectLocal ConfigLayerSource = "project-local"
)

// ConfigLayer holds the parsed content and metadata of a single config file.
type ConfigLayer struct {
	Source   ConfigLayerSource
	FilePath string
	Exists   bool
	Content  JsonObject
}

// EffectiveConfig is the result of merging all applicable config layers.
type EffectiveConfig struct {
	Merged JsonObject
	Layers []ConfigLayer
}

// GetConfigLayer reads a JSON config file and returns a ConfigLayer describing it.
// If the file does not exist, Exists is false and Content is nil.
// If the file exists but cannot be parsed, Exists is true and Content is nil.
func GetConfigLayer(filePath string, source ConfigLayerSource) ConfigLayer {
	_, err := os.Stat(filePath)
	if err != nil {
		return ConfigLayer{
			Source:   source,
			FilePath: filePath,
			Exists:   false,
			Content:  nil,
		}
	}

	data, err := os.ReadFile(filePath) //nolint:gosec // filePath is validated by ResolveLayerPath which returns only known config paths
	if err != nil {
		return ConfigLayer{Source: source, FilePath: filePath, Exists: true, Content: nil}
	}

	var obj JsonObject
	if err := json.Unmarshal(data, &obj); err != nil {
		return ConfigLayer{Source: source, FilePath: filePath, Exists: true, Content: nil}
	}

	return ConfigLayer{
		Source:   source,
		FilePath: filePath,
		Exists:   true,
		Content:  obj,
	}
}

// MergeConfigLayers builds the effective configuration by reading and deep-merging
// the global, global-local, and (if projectPath is non-empty) project + project-local
// config layers. Later layers take precedence.
func MergeConfigLayers(projectPath string) EffectiveConfig {
	claudeHome := ResolveClaudeHome()

	layers := []ConfigLayer{
		GetConfigLayer(filepath.Join(claudeHome, "settings.json"), ConfigLayerGlobal),
		GetConfigLayer(filepath.Join(claudeHome, "settings.local.json"), ConfigLayerGlobalLocal),
	}

	if projectPath != "" {
		layers = append(layers,
			GetConfigLayer(filepath.Join(projectPath, ".claude", "settings.json"), ConfigLayerProject),
			GetConfigLayer(filepath.Join(projectPath, ".claude", "settings.local.json"), ConfigLayerProjectLocal),
		)
	}

	merged := JsonObject{}
	for _, layer := range layers {
		if layer.Exists && layer.Content != nil {
			merged = deepMergeObjects(merged, layer.Content)
		}
	}

	return EffectiveConfig{Merged: merged, Layers: layers}
}

// deepMergeObjects recursively merges source into target, returning a new JsonObject.
// Object values are merged recursively; all other values (including arrays) are replaced.
func deepMergeObjects(target, source JsonObject) JsonObject {
	result := shallowCopy(target)
	for key, sourceVal := range source {
		targetVal, exists := result[key]
		if exists {
			targetMap, targetIsMap := targetVal.(JsonObject)
			sourceMap, sourceIsMap := sourceVal.(JsonObject)
			if targetIsMap && sourceIsMap {
				result[key] = deepMergeObjects(targetMap, sourceMap)
				continue
			}
		}
		result[key] = sourceVal
	}
	return result
}
