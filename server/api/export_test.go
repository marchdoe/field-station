package api //nolint:revive // "api" is a meaningful package name for this HTTP handler package

// ExportedResolveProjectPath exposes resolveProjectPath for black-box tests.
func ExportedResolveProjectPath(claudeHome, projectID string) (string, error) {
	return resolveProjectPath(claudeHome, projectID)
}
