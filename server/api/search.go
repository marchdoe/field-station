package api //nolint:revive // "api" is a meaningful package name for this HTTP handler package

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"

	"fieldstation/lib"
)

// searchMatchesQuery reports whether any of the provided text fragments
// contain the query string (case-insensitive). An empty query matches everything.
func searchMatchesQuery(query string, texts ...string) bool {
	if query == "" {
		return true
	}
	q := strings.ToLower(query)
	for _, t := range texts {
		if strings.Contains(strings.ToLower(t), q) {
			return true
		}
	}
	return false
}

// Search returns a filtered list of agents, commands, and skills matching the
// query string. When projectPath is provided, also includes project-scoped resources.
func (h *FieldStationHandler) Search(_ context.Context, request SearchRequestObject) (SearchResponseObject, error) {
	query := request.Params.Q

	// Resolve project path from projectId if provided.
	projectPath := ""
	if request.Params.ProjectId != nil && *request.Params.ProjectId != "" {
		pp, err := resolveProjectPath(h.claudeHome, *request.Params.ProjectId)
		if err != nil {
			return nil, fmt.Errorf("search: invalid project id: %w", err)
		}
		projectPath = pp
	}

	var results []SearchResult

	// --- Global Agents ---
	results = appendAgentResults(results, h.claudeHome, query)

	// --- Global Commands ---
	results = appendCommandResults(results, h.claudeHome, query)

	// --- Global Skills ---
	results = appendSkillResults(results, h.claudeHome, query)

	// --- Project resources (if projectPath provided) ---
	if projectPath != "" {
		projectClaudeDir := filepath.Join(projectPath, ".claude")
		results = appendAgentResults(results, projectClaudeDir, query)
		results = appendCommandResults(results, projectClaudeDir, query)
		results = appendSkillResults(results, projectClaudeDir, query)
	}

	if results == nil {
		results = []SearchResult{}
	}
	return Search200JSONResponse(results), nil
}

func appendAgentResults(results []SearchResult, claudeHome, query string) []SearchResult {
	agents, err := lib.ListResources(lib.ResourceTypeAgent, claudeHome)
	if err != nil {
		return results
	}
	for _, a := range agents {
		preview := lib.TruncateBody(a.Body, 5)
		if !searchMatchesQuery(query, a.Name, a.Description, preview) {
			continue
		}
		var descPtr *string
		if a.Description != "" {
			desc := a.Description
			descPtr = &desc
		}
		results = append(results, SearchResult{
			Type:        "agent",
			Name:        a.Name,
			Description: descPtr,
			FilePath:    a.FilePath,
			Preview:     preview,
		})
	}
	return results
}

func appendCommandResults(results []SearchResult, claudeHome, query string) []SearchResult {
	commandDir := filepath.Join(claudeHome, "commands")
	commands, err := listCommandsFromDir(commandDir)
	if err != nil {
		return results
	}
	for _, c := range commands {
		displayName := "/" + c.Folder + ":" + c.Name
		if !searchMatchesQuery(query, c.Name, c.Folder, c.BodyPreview) {
			continue
		}
		results = append(results, SearchResult{
			Type:     "command",
			Name:     displayName,
			FilePath: c.FilePath,
			Preview:  c.BodyPreview,
		})
	}
	return results
}

func appendSkillResults(results []SearchResult, claudeHome, query string) []SearchResult {
	skills, err := lib.ListResources(lib.ResourceTypeSkill, claudeHome)
	if err != nil {
		return results
	}
	for _, s := range skills {
		preview := lib.TruncateBody(s.Body, 5)
		if !searchMatchesQuery(query, s.Name, s.Description, preview) {
			continue
		}
		var descPtr *string
		if s.Description != "" {
			desc := s.Description
			descPtr = &desc
		}
		results = append(results, SearchResult{
			Type:        "skill",
			Name:        s.Name,
			Description: descPtr,
			FilePath:    s.FilePath,
			Preview:     preview,
		})
	}
	return results
}
