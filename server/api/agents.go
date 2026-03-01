// Package api implements the HTTP handler methods for the field-station REST API.
package api //nolint:revive // "api" is a meaningful package name for this HTTP handler package

import (
	"context"
	"fmt"
	"path/filepath"

	"fieldstation/lib"
)

// resolveAgentDir returns the directory containing agent .md files for the
// given scope. For project scope, projectPath is the decoded project root
// and agents live under .claude/agents/.
func (h *FieldStationHandler) resolveAgentDir(scope string, projectPath *string) (string, error) {
	if scope == "project" {
		if projectPath == nil || *projectPath == "" {
			return "", fmt.Errorf("projectId is required for project scope")
		}
		return filepath.Join(*projectPath, ".claude", "agents"), nil
	}
	return filepath.Join(h.claudeHome, "agents"), nil
}

// agentClaudeHome returns a synthetic claudeHome string that points to the
// parent of the resolved agent directory, so that lib.ListResources /
// lib.GetResource / etc. (which call ResolveResourceDir internally) resolve
// to the correct folder.
//
// lib.ResolveResourceDir returns filepath.Join(claudeHome, "agents") for the
// agent resource type. By passing the parent of the desired agent directory
// as claudeHome we can redirect those calls to an arbitrary path (e.g. a
// project's .claude/ directory).
func agentClaudeHomeFor(agentDir string) string {
	// agentDir ends with "agents"; its parent is the effective claudeHome.
	return filepath.Dir(agentDir)
}

// resourceFileToAgentFile converts a lib.ResourceFile to the API AgentFile type.
func resourceFileToAgentFile(rf lib.ResourceFile) AgentFile {
	var color *string
	if c, ok := rf.Frontmatter["color"].(string); ok && c != "" {
		color = &c
	}
	var tools *string
	if t, ok := rf.Frontmatter["tools"].(string); ok && t != "" {
		tools = &t
	}
	return AgentFile{
		Name:        rf.Name,
		Description: rf.Description,
		FileName:    rf.ID + ".md",
		FilePath:    rf.FilePath,
		Tools:       tools,
		Color:       color,
		BodyPreview: lib.TruncateBody(rf.Body, 5),
		IsEditable:  lib.IsUserOwned(rf.FilePath),
	}
}

// resourceFileToAgentDetail converts a lib.ResourceFile to the API AgentDetail type.
func resourceFileToAgentDetail(rf lib.ResourceFile) AgentDetail {
	var color *string
	if c, ok := rf.Frontmatter["color"].(string); ok && c != "" {
		color = &c
	}
	var tools *string
	if t, ok := rf.Frontmatter["tools"].(string); ok && t != "" {
		tools = &t
	}
	return AgentDetail{
		Name:        rf.Name,
		Description: rf.Description,
		FileName:    rf.ID + ".md",
		FilePath:    rf.FilePath,
		Tools:       tools,
		Color:       color,
		Body:        rf.Body,
		IsEditable:  lib.IsUserOwned(rf.FilePath),
	}
}

// GetAgents lists all agent files for the given scope.
func (h *FieldStationHandler) GetAgents(_ context.Context, request GetAgentsRequestObject) (GetAgentsResponseObject, error) {
	scope := "global"
	if request.Params.Scope != nil {
		scope = string(*request.Params.Scope)
	}

	var projectPath *string
	if request.Params.ProjectId != nil && *request.Params.ProjectId != "" {
		pp, err := resolveProjectPath(h.claudeHome, *request.Params.ProjectId)
		if err != nil {
			return nil, err
		}
		projectPath = &pp
	}
	agentDir, err := h.resolveAgentDir(scope, projectPath)
	if err != nil {
		return nil, err
	}

	files, err := lib.ListResources(lib.ResourceTypeAgent, agentClaudeHomeFor(agentDir))
	if err != nil {
		return nil, err
	}

	result := make([]AgentFile, len(files))
	for i, rf := range files {
		result[i] = resourceFileToAgentFile(rf)
	}
	return GetAgents200JSONResponse(result), nil
}

// GetAgent returns the detail of a single agent by name.
func (h *FieldStationHandler) GetAgent(_ context.Context, request GetAgentRequestObject) (GetAgentResponseObject, error) {
	scope := "global"
	if request.Params.Scope != nil {
		scope = *request.Params.Scope
	}

	var projectPath *string
	if request.Params.ProjectId != nil && *request.Params.ProjectId != "" {
		pp, err := resolveProjectPath(h.claudeHome, *request.Params.ProjectId)
		if err != nil {
			return nil, err
		}
		projectPath = &pp
	}
	agentDir, err := h.resolveAgentDir(scope, projectPath)
	if err != nil {
		return nil, err
	}

	rf, err := lib.GetResource(lib.ResourceTypeAgent, request.Name, agentClaudeHomeFor(agentDir))
	if err != nil {
		return nil, err
	}
	return GetAgent200JSONResponse(resourceFileToAgentDetail(rf)), nil
}

// CreateAgent creates a new agent file.
func (h *FieldStationHandler) CreateAgent(_ context.Context, request CreateAgentRequestObject) (CreateAgentResponseObject, error) {
	if request.Body == nil {
		return nil, fmt.Errorf("request body is required")
	}
	body := request.Body

	var projectPath *string
	if body.ProjectId != nil && *body.ProjectId != "" {
		pp, err := resolveProjectPath(h.claudeHome, *body.ProjectId)
		if err != nil {
			return nil, err
		}
		projectPath = &pp
	}
	agentDir, err := h.resolveAgentDir(string(body.Scope), projectPath)
	if err != nil {
		return nil, err
	}

	// Build markdown content from the incoming body + optional frontmatter fields.
	fm := lib.FrontmatterDoc{
		Frontmatter: map[string]any{},
		Body:        body.Body,
	}
	if body.Name != "" {
		fm.Frontmatter["name"] = body.Name
	}
	if body.Description != nil && *body.Description != "" {
		fm.Frontmatter["description"] = *body.Description
	}
	if body.Tools != nil && *body.Tools != "" {
		fm.Frontmatter["tools"] = *body.Tools
	}
	if body.Color != nil && *body.Color != "" {
		fm.Frontmatter["color"] = *body.Color
	}

	// Reject writes to plugin-managed files (files not owned by the user).
	agentFilePath := filepath.Join(agentDir, body.Name+".md")
	if !lib.IsUserOwned(agentFilePath) {
		return nil, fmt.Errorf("agents: cannot write plugin-managed file: %s", agentFilePath)
	}

	content := lib.SerializeMarkdown(fm)
	rf, err := lib.CreateResource(lib.ResourceTypeAgent, body.Name, content, agentClaudeHomeFor(agentDir))
	if err != nil {
		return nil, err
	}
	return CreateAgent200JSONResponse(resourceFileToAgentFile(rf)), nil
}

// UpdateAgent updates an existing agent file.
func (h *FieldStationHandler) UpdateAgent(_ context.Context, request UpdateAgentRequestObject) (UpdateAgentResponseObject, error) {
	if request.Body == nil {
		return nil, fmt.Errorf("request body is required")
	}
	body := request.Body

	var projectPath *string
	if body.ProjectId != nil && *body.ProjectId != "" {
		pp, err := resolveProjectPath(h.claudeHome, *body.ProjectId)
		if err != nil {
			return nil, err
		}
		projectPath = &pp
	}
	agentDir, err := h.resolveAgentDir(string(body.Scope), projectPath)
	if err != nil {
		return nil, err
	}

	// Reject writes to plugin-managed files.
	filePath := filepath.Join(agentDir, request.Name+".md")
	if !lib.IsUserOwned(filePath) {
		return nil, fmt.Errorf("agents: cannot write plugin-managed file: %s", filePath)
	}

	fm := lib.FrontmatterDoc{
		Frontmatter: map[string]any{},
		Body:        body.Body,
	}
	// Preserve name in frontmatter (use path name as the display name key).
	fm.Frontmatter["name"] = request.Name
	if body.Description != nil && *body.Description != "" {
		fm.Frontmatter["description"] = *body.Description
	}
	if body.Tools != nil && *body.Tools != "" {
		fm.Frontmatter["tools"] = *body.Tools
	}
	if body.Color != nil && *body.Color != "" {
		fm.Frontmatter["color"] = *body.Color
	}

	content := lib.SerializeMarkdown(fm)

	// For project-scope agents, ensure the backup is written to the global claudeHome so
	// it appears in Change History. lib.UpdateResource backs up to its own claudeHome
	// argument, which for project agents is the project's .claude/ directory.
	effectiveClaudeHome := agentClaudeHomeFor(agentDir)
	if effectiveClaudeHome != h.claudeHome {
		lib.BackupFile(filePath, lib.BackupOpUpdate, h.claudeHome)
	}

	rf, err := lib.UpdateResource(lib.ResourceTypeAgent, request.Name, content, effectiveClaudeHome)
	if err != nil {
		return nil, err
	}
	return UpdateAgent200JSONResponse(resourceFileToAgentDetail(rf)), nil
}

// DeleteAgent deletes an agent file.
func (h *FieldStationHandler) DeleteAgent(_ context.Context, request DeleteAgentRequestObject) (DeleteAgentResponseObject, error) {
	if request.Body == nil {
		return nil, fmt.Errorf("request body is required")
	}
	body := request.Body

	var projectPath *string
	if body.ProjectId != nil && *body.ProjectId != "" {
		pp, err := resolveProjectPath(h.claudeHome, *body.ProjectId)
		if err != nil {
			return nil, err
		}
		projectPath = &pp
	}
	agentDir, err := h.resolveAgentDir(string(body.Scope), projectPath)
	if err != nil {
		return nil, err
	}

	// Reject deletes of plugin-managed files.
	filePath := filepath.Join(agentDir, request.Name+".md")
	if !lib.IsUserOwned(filePath) {
		return nil, fmt.Errorf("agents: cannot delete plugin-managed file: %s", filePath)
	}

	// For project-scope agents, ensure the backup lands in the global claudeHome
	// so it is visible in Change History.
	effectiveClaudeHome := agentClaudeHomeFor(agentDir)
	if effectiveClaudeHome != h.claudeHome {
		lib.BackupFile(filePath, lib.BackupOpDelete, h.claudeHome)
	}

	if err := lib.DeleteResource(lib.ResourceTypeAgent, request.Name, effectiveClaudeHome); err != nil {
		return nil, err
	}
	return DeleteAgent200JSONResponse(SuccessResponse{Success: true}), nil
}
