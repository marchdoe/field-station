package lib

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// ReadJsonFileSafe reads and parses a JSON object from filePath.
// Returns an empty JsonObject on any error (missing file, invalid JSON, etc.).
func ReadJsonFileSafe(filePath string) JsonObject {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return JsonObject{}
	}
	var obj JsonObject
	if err := json.Unmarshal(data, &obj); err != nil {
		return JsonObject{}
	}
	return obj
}

// WriteJsonFileSafe writes obj to filePath as pretty-printed JSON followed by a newline.
// Creates all parent directories if they do not exist. Uses WriteFileAtomic for safe writes.
func WriteJsonFileSafe(filePath string, obj JsonObject) error {
	dir := filepath.Dir(filePath)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("configwriter mkdir: %w", err)
	}
	out, err := json.MarshalIndent(obj, "", "  ")
	if err != nil {
		return fmt.Errorf("configwriter marshal: %w", err)
	}
	out = append(out, '\n')
	return WriteFileAtomic(filePath, out)
}

// ResolveLayerPath maps a ConfigLayerSource to the filesystem path of the corresponding
// settings file. For project and project-local layers, projectPath must be non-empty.
func ResolveLayerPath(source ConfigLayerSource, projectPath string) (string, error) {
	claudeHome := ResolveClaudeHome()
	switch source {
	case ConfigLayerGlobal:
		return filepath.Join(claudeHome, "settings.json"), nil
	case ConfigLayerGlobalLocal:
		return filepath.Join(claudeHome, "settings.local.json"), nil
	case ConfigLayerProject:
		if projectPath == "" {
			return "", fmt.Errorf("projectPath required for project layer")
		}
		return filepath.Join(projectPath, ".claude", "settings.json"), nil
	case ConfigLayerProjectLocal:
		if projectPath == "" {
			return "", fmt.Errorf("projectPath required for project-local layer")
		}
		return filepath.Join(projectPath, ".claude", "settings.local.json"), nil
	default:
		return "", fmt.Errorf("unknown layer source: %s", source)
	}
}

// ApplyUpdateSetting reads the JSON file at filePath, sets keyPath to value,
// backs up the original file, then writes the updated object.
func ApplyUpdateSetting(filePath string, keyPath string, value any, claudeHome string) error {
	current := ReadJsonFileSafe(filePath)
	updated := SetAtPath(current, keyPath, value)
	BackupFile(filePath, BackupOpUpdate, claudeHome)
	return WriteJsonFileSafe(filePath, updated)
}

// ApplyDeleteSetting reads the JSON file at filePath, removes the key at keyPath,
// backs up the original, then writes the updated object.
// Returns an error if the file does not exist.
func ApplyDeleteSetting(filePath string, keyPath string, claudeHome string) error {
	if _, err := os.Stat(filePath); err != nil {
		return fmt.Errorf("file does not exist: %s", filePath)
	}
	current := ReadJsonFileSafe(filePath)
	updated := DeleteAtPath(current, keyPath)
	BackupFile(filePath, BackupOpDelete, claudeHome)
	return WriteJsonFileSafe(filePath, updated)
}

// ApplyMoveSetting moves the value at keyPath from fromPath to toPath.
// Backs up both files before writing. Returns an error if keyPath is not found in fromPath.
func ApplyMoveSetting(fromPath, toPath, keyPath string, claudeHome string) error {
	fromData := ReadJsonFileSafe(fromPath)
	value, ok := GetAtPath(fromData, keyPath)
	if !ok {
		return fmt.Errorf("key %q not found in source file", keyPath)
	}
	toData := ReadJsonFileSafe(toPath)
	BackupFile(fromPath, BackupOpMove, claudeHome)
	BackupFile(toPath, BackupOpMove, claudeHome)
	if err := WriteJsonFileSafe(toPath, SetAtPath(toData, keyPath, value)); err != nil {
		return err
	}
	return WriteJsonFileSafe(fromPath, DeleteAtPath(fromData, keyPath))
}
