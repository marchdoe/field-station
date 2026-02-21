package api

// ExportedResolveProjectPath exposes resolveProjectPath for black-box tests.
func ExportedResolveProjectPath(claudeHome, projectId string) (string, error) {
	return resolveProjectPath(claudeHome, projectId)
}
