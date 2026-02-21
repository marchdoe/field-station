package api

import (
	"context"
	"encoding/json"
	"fmt"
	"path/filepath"
	"strconv"
	"strings"

	"fieldstation/lib"
)

// settingsHookDefinition mirrors the JSON structure of a hook definition
// in settings.json:  { hooks: [{type: "command", command: "..."}], matcher?: "..." }
type settingsHookDefinition struct {
	Hooks   []settingsHookCommand `json:"hooks"`
	Matcher string                `json:"matcher,omitempty"`
}

type settingsHookCommand struct {
	Type    string `json:"type"`
	Command string `json:"command"`
}

// hookEvents is the ordered list of recognised hook event names.
var hookEvents = []string{
	"SessionStart",
	"UserPromptSubmit",
	"PreToolUse",
	"PostToolUse",
	"Notification",
	"Stop",
	"SubagentStop",
}

// validHookEvent reports whether event is one of the recognised hook event names.
func validHookEvent(event string) bool {
	for _, e := range hookEvents {
		if e == event {
			return true
		}
	}
	return false
}

// settingsHooksPath returns the path to the settings.json used for hooks.
// If scope is "project" and projectPath is non-empty, returns the project
// settings path; otherwise returns the global settings path.
func (h *FieldStationHandler) settingsHooksPath(scope string, projectPath string) string {
	if scope == "project" && projectPath != "" {
		return filepath.Join(projectPath, ".claude", "settings.json")
	}
	return filepath.Join(h.claudeHome, "settings.json")
}

// readHooksByEvent reads the hooks map from a settings.json file.
// Returns nil if the file does not exist or has no hooks key.
func readHooksByEvent(settingsPath string) map[string][]settingsHookDefinition {
	settings := lib.ReadJsonFileSafe(settingsPath)
	hooksRaw, ok := settings["hooks"]
	if !ok || hooksRaw == nil {
		return nil
	}
	// Re-marshal and unmarshal to get typed hook structs.
	data, err := json.Marshal(hooksRaw)
	if err != nil {
		return nil
	}
	var result map[string][]settingsHookDefinition
	if err := json.Unmarshal(data, &result); err != nil {
		return nil
	}
	return result
}

// hooksByEventToAPIType converts the raw hooks map to the API HooksByEvent type.
func hooksByEventToAPIType(hooksMap map[string][]settingsHookDefinition) *HooksByEvent {
	if len(hooksMap) == 0 {
		return nil
	}
	out := &HooksByEvent{}
	for event, defs := range hooksMap {
		apiDefs := make([]HookDefinition, 0, len(defs))
		for _, d := range defs {
			cmds := make([]HookCommand, 0, len(d.Hooks))
			for _, c := range d.Hooks {
				cmds = append(cmds, HookCommand{
					Type:    HookCommandType(c.Type),
					Command: c.Command,
				})
			}
			var matcher *string
			if d.Matcher != "" {
				m := d.Matcher
				matcher = &m
			}
			apiDefs = append(apiDefs, HookDefinition{
				Hooks:   cmds,
				Matcher: matcher,
			})
		}
		switch event {
		case "SessionStart":
			out.SessionStart = &apiDefs
		case "UserPromptSubmit":
			out.UserPromptSubmit = &apiDefs
		case "PreToolUse":
			out.PreToolUse = &apiDefs
		case "PostToolUse":
			out.PostToolUse = &apiDefs
		case "Notification":
			out.Notification = &apiDefs
		case "Stop":
			out.Stop = &apiDefs
		case "SubagentStop":
			out.SubagentStop = &apiDefs
		}
	}
	return out
}

// GetHooks reads hooks from global (and optionally project) settings.
func (h *FieldStationHandler) GetHooks(ctx context.Context, request GetHooksRequestObject) (GetHooksResponseObject, error) {
	globalSettingsPath := filepath.Join(h.claudeHome, "settings.json")
	globalHooks := readHooksByEvent(globalSettingsPath)
	globalByEvent := hooksByEventToAPIType(globalHooks)

	resp := HooksResponse{
		Global: &HookScope{
			Hooks: globalByEvent,
		},
	}

	if request.Params.ProjectId != nil && *request.Params.ProjectId != "" {
		pp, err := resolveProjectPath(h.claudeHome, *request.Params.ProjectId)
		if err != nil {
			return nil, fmt.Errorf("invalid project id: %w", err)
		}
		projectSettingsPath := filepath.Join(pp, ".claude", "settings.json")
		projectHooks := readHooksByEvent(projectSettingsPath)
		projectByEvent := hooksByEventToAPIType(projectHooks)
		resp.Project = &HookScope{
			Hooks: projectByEvent,
		}
	}

	return GetHooks200JSONResponse(resp), nil
}

// parseHookID parses a hook ID of the format "event:index" (e.g., "PreToolUse:0").
func parseHookID(id string) (event string, index int, err error) {
	parts := strings.SplitN(id, ":", 2)
	if len(parts) != 2 {
		return "", 0, fmt.Errorf("invalid hook ID %q: expected format event:index", id)
	}
	event = parts[0]
	idx, convErr := strconv.Atoi(parts[1])
	if convErr != nil {
		return "", 0, fmt.Errorf("invalid hook ID %q: index is not an integer", id)
	}
	return event, idx, nil
}

// writeHooksToSettings reads settings, replaces the hooks key, and writes back atomically.
func writeHooksToSettings(settingsPath string, claudeHome string, hooksMap map[string][]settingsHookDefinition) error {
	settings := lib.ReadJsonFileSafe(settingsPath)

	if len(hooksMap) == 0 {
		delete(settings, "hooks")
	} else {
		// Encode hooksMap as a JsonObject value.
		data, err := json.Marshal(hooksMap)
		if err != nil {
			return fmt.Errorf("hooks: cannot marshal hooks: %w", err)
		}
		var hooksObj interface{}
		if err := json.Unmarshal(data, &hooksObj); err != nil {
			return fmt.Errorf("hooks: cannot unmarshal hooks: %w", err)
		}
		settings["hooks"] = hooksObj
	}

	lib.BackupFile(settingsPath, lib.BackupOpUpdate, claudeHome)
	return lib.WriteJsonFileSafe(settingsPath, settings)
}

// CreateHook appends a new HookDefinition to the specified event in settings.
func (h *FieldStationHandler) CreateHook(ctx context.Context, request CreateHookRequestObject) (CreateHookResponseObject, error) {
	if request.Body == nil {
		return nil, fmt.Errorf("request body is required")
	}
	body := request.Body

	projectPath := ""
	if body.ProjectId != nil && *body.ProjectId != "" {
		pp, err := resolveProjectPath(h.claudeHome, *body.ProjectId)
		if err != nil {
			return nil, err
		}
		projectPath = pp
	}
	settingsPath := h.settingsHooksPath(string(body.Scope), projectPath)

	if !validHookEvent(body.Event) {
		return nil, fmt.Errorf("invalid hook event: %q", body.Event)
	}

	hooksMap := readHooksByEvent(settingsPath)
	if hooksMap == nil {
		hooksMap = make(map[string][]settingsHookDefinition)
	}

	cmds := make([]settingsHookCommand, 0, len(body.Commands))
	for _, cmd := range body.Commands {
		cmds = append(cmds, settingsHookCommand{Type: "command", Command: cmd})
	}

	newDef := settingsHookDefinition{Hooks: cmds}
	if body.Matcher != nil && *body.Matcher != "" {
		newDef.Matcher = *body.Matcher
	}
	hooksMap[body.Event] = append(hooksMap[body.Event], newDef)

	if err := writeHooksToSettings(settingsPath, h.claudeHome, hooksMap); err != nil {
		return nil, fmt.Errorf("hooks: failed to write settings: %w", err)
	}
	return CreateHook200JSONResponse(SuccessResponse{Success: true}), nil
}

// UpdateHook replaces the hook at the given event:index position.
func (h *FieldStationHandler) UpdateHook(ctx context.Context, request UpdateHookRequestObject) (UpdateHookResponseObject, error) {
	if request.Body == nil {
		return nil, fmt.Errorf("request body is required")
	}
	body := request.Body

	event, index, err := parseHookID(request.Id)
	if err != nil {
		return nil, err
	}

	projectPath := ""
	if body.ProjectId != nil && *body.ProjectId != "" {
		pp, err := resolveProjectPath(h.claudeHome, *body.ProjectId)
		if err != nil {
			return nil, err
		}
		projectPath = pp
	}
	settingsPath := h.settingsHooksPath(string(body.Scope), projectPath)

	if !validHookEvent(body.Event) {
		return nil, fmt.Errorf("invalid hook event: %q", body.Event)
	}

	hooksMap := readHooksByEvent(settingsPath)
	if hooksMap == nil {
		return nil, fmt.Errorf("hooks: no hooks found for event %q", event)
	}

	defs, ok := hooksMap[event]
	if !ok || index < 0 || index >= len(defs) {
		return nil, fmt.Errorf("hooks: hook %q not found (event=%s, index=%d)", request.Id, event, index)
	}

	cmds := make([]settingsHookCommand, 0, len(body.Commands))
	for _, cmd := range body.Commands {
		cmds = append(cmds, settingsHookCommand{Type: "command", Command: cmd})
	}
	updatedDef := settingsHookDefinition{Hooks: cmds}
	if body.Matcher != nil && *body.Matcher != "" {
		updatedDef.Matcher = *body.Matcher
	}
	hooksMap[event][index] = updatedDef

	if err := writeHooksToSettings(settingsPath, h.claudeHome, hooksMap); err != nil {
		return nil, fmt.Errorf("hooks: failed to write settings: %w", err)
	}
	return UpdateHook200JSONResponse(SuccessResponse{Success: true}), nil
}

// DeleteHook removes the hook at the given event:index position.
func (h *FieldStationHandler) DeleteHook(ctx context.Context, request DeleteHookRequestObject) (DeleteHookResponseObject, error) {
	event, index, err := parseHookID(request.Id)
	if err != nil {
		return nil, err
	}

	scope := "global"
	if request.Params.Scope != nil && *request.Params.Scope != "" {
		scope = *request.Params.Scope
	}

	projectPath := ""
	if request.Params.ProjectId != nil && *request.Params.ProjectId != "" {
		pp, err := resolveProjectPath(h.claudeHome, *request.Params.ProjectId)
		if err != nil {
			return nil, err
		}
		projectPath = pp
	}
	settingsPath := h.settingsHooksPath(scope, projectPath)

	hooksMap := readHooksByEvent(settingsPath)
	if hooksMap == nil {
		return nil, fmt.Errorf("hooks: no hooks found for event %q", event)
	}

	defs, ok := hooksMap[event]
	if !ok || index < 0 || index >= len(defs) {
		return nil, fmt.Errorf("hooks: hook %q not found (event=%s, index=%d)", request.Id, event, index)
	}

	// Remove the hook at the given index.
	hooksMap[event] = append(defs[:index], defs[index+1:]...)
	// Clean up empty event slices.
	if len(hooksMap[event]) == 0 {
		delete(hooksMap, event)
	}

	if err := writeHooksToSettings(settingsPath, h.claudeHome, hooksMap); err != nil {
		return nil, fmt.Errorf("hooks: failed to write settings: %w", err)
	}
	return DeleteHook200JSONResponse(SuccessResponse{Success: true}), nil
}
