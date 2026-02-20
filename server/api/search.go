package api

import (
	"context"
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
// query string. Results are drawn from the global scope only.
func (h *FieldStationHandler) Search(ctx context.Context, request SearchRequestObject) (SearchResponseObject, error) {
	query := request.Params.Q

	var results []SearchResult

	// --- Agents ---
	agents, err := lib.ListResources(lib.ResourceTypeAgent, h.claudeHome)
	if err == nil {
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
	}

	// --- Commands ---
	// Commands live under <claudeHome>/commands/<folder>/<name>.md.
	// Re-use the package-level listCommandsFromDir function from commands.go.
	commandDir := filepath.Join(h.claudeHome, "commands")
	commands, err := listCommandsFromDir(commandDir)
	if err == nil {
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
	}

	// --- Skills ---
	skills, err := lib.ListResources(lib.ResourceTypeSkill, h.claudeHome)
	if err == nil {
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
	}

	if results == nil {
		results = []SearchResult{}
	}
	return Search200JSONResponse(results), nil
}
