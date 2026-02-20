package lib

import (
	"encoding/json"
	"os"
	"path/filepath"
)

const versionFileName = "claude-version.json"

// versionFile is the JSON structure of the version persistence file.
type versionFile struct {
	Version *string `json:"version"`
}

// ReadPersistedVersion reads the persisted version from dataDir/claude-version.json.
// Returns "" on any error (missing file, malformed JSON, missing or non-string version field).
func ReadPersistedVersion(dataDir string) string {
	filePath := filepath.Join(dataDir, versionFileName)
	data, err := os.ReadFile(filePath)
	if err != nil {
		return ""
	}
	var v versionFile
	if err := json.Unmarshal(data, &v); err != nil {
		return ""
	}
	if v.Version == nil {
		return ""
	}
	return *v.Version
}

// WritePersistedVersion writes the given version string to dataDir/claude-version.json.
// Creates dataDir if it does not exist. Uses WriteFileAtomic for safe writes.
// An empty version string is stored as {"version":null}.
func WritePersistedVersion(dataDir string, version string) error {
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		return err
	}
	filePath := filepath.Join(dataDir, versionFileName)

	var v versionFile
	if version != "" {
		v.Version = &version
	}
	// v.Version remains nil for empty string → marshals as {"version":null}

	out, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	out = append(out, '\n')
	return WriteFileAtomic(filePath, out)
}
