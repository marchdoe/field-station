package lib

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// BackupOperation describes the mutation type that triggered a backup.
type BackupOperation string

const (
	BackupOpUpdate BackupOperation = "update"
	BackupOpDelete BackupOperation = "delete"
	BackupOpMove   BackupOperation = "move"
)

// BackupEntry is a parsed record of a single backup snapshot.
type BackupEntry struct {
	ID           string
	Timestamp    time.Time
	OriginalPath string
	Operation    BackupOperation
}

// backupMeta is the JSON structure written to meta.json inside each backup dir.
type backupMeta struct {
	OriginalPath string `json:"originalPath"`
	Operation    string `json:"operation"`
	Timestamp    string `json:"timestamp"`
}

const retentionDuration = 30 * 24 * time.Hour

// parseTimestamp parses a timestamp string in RFC3339Nano or RFC3339 format.
func parseTimestamp(s string) (time.Time, error) {
	if t, err := time.Parse(time.RFC3339Nano, s); err == nil {
		return t, nil
	}
	return time.Parse(time.RFC3339, s)
}

func backupsDirPath(claudeHome string) string {
	return filepath.Join(claudeHome, "backups")
}

// generateBackupID creates a backup directory name in the format:
// 2006-01-02T15-04-05Z-aabbcc (ISO timestamp with colons/dots replaced by dashes + 3 random hex bytes)
func generateBackupID() string {
	now := time.Now().UTC()
	// Format as RFC3339 then replace : and . with -
	ts := now.Format(time.RFC3339Nano)
	ts = strings.ReplaceAll(ts, ":", "-")
	ts = strings.ReplaceAll(ts, ".", "-")

	buf := make([]byte, 3)
	if _, err := rand.Read(buf); err != nil {
		// Fallback to a pseudo-random suffix using nanoseconds
		ns := now.UnixNano()
		buf[0] = byte(ns)
		buf[1] = byte(ns >> 8)
		buf[2] = byte(ns >> 16)
	}
	return ts + "-" + hex.EncodeToString(buf)
}

// copyFile copies src to dst, creating dst if it does not exist.
func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	if _, err = io.Copy(out, in); err != nil {
		return err
	}
	return out.Sync()
}

// BackupFile copies filePath into a new backup entry under claudeHome/backups/.
// Returns the backup directory path, or "" if the source file does not exist or
// any error occurs. Never panics or returns an error — backup failure must not
// block the caller's write operation.
// Prune runs asynchronously in a goroutine after a successful backup.
func BackupFile(filePath string, operation BackupOperation, claudeHome string) string {
	result, err := doBackupFile(filePath, operation, claudeHome)
	if err != nil {
		return ""
	}
	// Prune asynchronously — does not add latency to the caller
	go func() {
		PruneOldBackups(claudeHome)
	}()
	return result
}

func doBackupFile(filePath string, operation BackupOperation, claudeHome string) (string, error) {
	if _, err := os.Stat(filePath); err != nil {
		return "", fmt.Errorf("source file does not exist: %w", err)
	}

	id := generateBackupID()
	dir := filepath.Join(backupsDirPath(claudeHome), id)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", fmt.Errorf("cannot create backup dir: %w", err)
	}

	meta := backupMeta{
		OriginalPath: filePath,
		Operation:    string(operation),
		Timestamp:    time.Now().UTC().Format(time.RFC3339Nano),
	}
	metaBytes, err := json.MarshalIndent(meta, "", "  ")
	if err != nil {
		return "", fmt.Errorf("cannot marshal meta: %w", err)
	}
	if err := os.WriteFile(filepath.Join(dir, "meta.json"), metaBytes, 0o644); err != nil {
		return "", fmt.Errorf("cannot write meta.json: %w", err)
	}

	if err := copyFile(filePath, filepath.Join(dir, "file")); err != nil {
		return "", fmt.Errorf("cannot copy file: %w", err)
	}

	return dir, nil
}

// ListBackups returns all backup entries in claudeHome/backups/, sorted newest first.
func ListBackups(claudeHome string) []BackupEntry {
	dir := backupsDirPath(claudeHome)
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil
	}

	var result []BackupEntry
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		id := entry.Name()
		metaPath := filepath.Join(dir, id, "meta.json")
		data, err := os.ReadFile(metaPath)
		if err != nil {
			continue
		}
		var meta backupMeta
		if err := json.Unmarshal(data, &meta); err != nil {
			continue
		}
		if meta.OriginalPath == "" || meta.Operation == "" || meta.Timestamp == "" {
			continue
		}
		ts, err := parseTimestamp(meta.Timestamp)
		if err != nil {
			continue
		}
		result = append(result, BackupEntry{
			ID:           id,
			Timestamp:    ts,
			OriginalPath: meta.OriginalPath,
			Operation:    BackupOperation(meta.Operation),
		})
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].Timestamp.After(result[j].Timestamp)
	})
	return result
}

// PruneOldBackups deletes backup entries older than 30 days. Non-fatal.
func PruneOldBackups(claudeHome string) {
	dir := backupsDirPath(claudeHome)
	entries, err := os.ReadDir(dir)
	if err != nil {
		return
	}

	cutoff := time.Now().UTC().Add(-retentionDuration)

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		entryDir := filepath.Join(dir, entry.Name())
		metaPath := filepath.Join(entryDir, "meta.json")
		data, err := os.ReadFile(metaPath)
		if err != nil {
			// Corrupted entry (no meta.json) — always remove
			os.RemoveAll(entryDir)
			continue
		}
		var meta backupMeta
		if err := json.Unmarshal(data, &meta); err != nil {
			continue
		}
		ts, err := parseTimestamp(meta.Timestamp)
		if err != nil {
			continue
		}
		if ts.Before(cutoff) {
			os.RemoveAll(entryDir)
		}
	}
}

// RestoreBackup restores a backup entry to its original path.
// It backs up the current file first (making the restore itself undoable).
func RestoreBackup(backupDir string, claudeHome string) error {
	metaPath := filepath.Join(backupDir, "meta.json")
	data, err := os.ReadFile(metaPath)
	if err != nil {
		return fmt.Errorf("backup is corrupted — missing meta.json: %s", backupDir)
	}

	var meta backupMeta
	if err := json.Unmarshal(data, &meta); err != nil {
		return fmt.Errorf("backup is corrupted — invalid meta.json: %s", backupDir)
	}
	if meta.OriginalPath == "" || meta.Operation == "" || meta.Timestamp == "" {
		return fmt.Errorf("backup is corrupted — invalid meta.json: %s", backupDir)
	}

	// Back up the current file first so restore is undoable
	BackupFile(meta.OriginalPath, BackupOpUpdate, claudeHome)

	// Ensure the parent directory exists
	parentDir := filepath.Dir(meta.OriginalPath)
	if err := os.MkdirAll(parentDir, 0o755); err != nil {
		return fmt.Errorf("cannot create parent directory: %w", err)
	}

	backupFilePath := filepath.Join(backupDir, "file")
	if _, err := os.Stat(backupFilePath); err != nil {
		return fmt.Errorf("backup is corrupted — missing file: %s", backupDir)
	}

	if err := copyFile(backupFilePath, meta.OriginalPath); err != nil {
		return fmt.Errorf("cannot restore file: %w", err)
	}

	return nil
}
