package lib

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
)

// WriteFileAtomic writes content to filePath atomically (write-to-temp, rename).
// Ensures no partial writes are visible.
func WriteFileAtomic(filePath string, content []byte) error {
	dir := filepath.Dir(filePath)
	b := make([]byte, 6)
	if _, err := rand.Read(b); err != nil {
		return fmt.Errorf("atomicwrite rand: %w", err)
	}
	tmpPath := filepath.Join(dir, ".tmp-"+hex.EncodeToString(b))

	if err := os.WriteFile(tmpPath, content, 0o644); err != nil {
		return fmt.Errorf("atomicwrite write tmp: %w", err)
	}

	if err := os.Rename(tmpPath, filePath); err != nil {
		_ = os.Remove(tmpPath)
		return fmt.Errorf("atomicwrite rename: %w", err)
	}

	return nil
}
