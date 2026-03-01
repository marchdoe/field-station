package api //nolint:revive // "api" is a meaningful package name for this HTTP handler package

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"regexp"

	"fieldstation/lib"
)

// validBackupIDPattern mirrors the TypeScript input validator:
// /^[a-zA-Z0-9-]+$/
var validBackupIDPattern = regexp.MustCompile(`^[a-zA-Z0-9-]+$`)

// GetBackups lists all backup entries from ~/.claude/backups/, newest first.
func (h *FieldStationHandler) GetBackups(_ context.Context, _ GetBackupsRequestObject) (GetBackupsResponseObject, error) {
	entries := lib.ListBackups(h.claudeHome)

	result := make([]BackupFile, 0, len(entries))
	for _, e := range entries {
		backupFilePath := filepath.Join(h.claudeHome, "backups", e.ID, "file")
		var size int64
		if fi, err := os.Stat(backupFilePath); err == nil {
			size = fi.Size()
		}
		result = append(result, BackupFile{
			Id:           e.ID,
			FilePath:     backupFilePath,
			OriginalPath: e.OriginalPath,
			CreatedAt:    e.Timestamp.UTC().Format("2006-01-02T15:04:05Z07:00"),
			Size:         size,
		})
	}
	return GetBackups200JSONResponse(result), nil
}

// RestoreBackup restores a backup snapshot by ID.
func (h *FieldStationHandler) RestoreBackup(_ context.Context, request RestoreBackupRequestObject) (RestoreBackupResponseObject, error) {
	id := request.Id
	if !validBackupIDPattern.MatchString(id) {
		return nil, fmt.Errorf("invalid backup ID format: %q", id)
	}

	backupDir := filepath.Join(h.claudeHome, "backups", id)
	allowedRoots := []string{filepath.Join(h.claudeHome, "backups")}
	if _, err := lib.AssertSafePath(backupDir, allowedRoots); err != nil {
		return nil, fmt.Errorf("backup path validation failed: %w", err)
	}

	if err := lib.RestoreBackup(backupDir, h.claudeHome); err != nil {
		return nil, fmt.Errorf("restore failed: %w", err)
	}
	return RestoreBackup200JSONResponse(SuccessResponse{Success: true}), nil
}
