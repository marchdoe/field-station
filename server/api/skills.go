package api

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"fieldstation/lib"
)

// resolveSkillDir returns the root skills directory for the given scope.
// Skills live at <claudeHome>/skills/ (global) or <projectPath>/.claude/skills/ (project).
func (h *FieldStationHandler) resolveSkillDir(scope string, projectPath *string) (string, error) {
	if scope == "project" {
		if projectPath == nil || *projectPath == "" {
			return "", fmt.Errorf("projectPath is required for project scope")
		}
		return filepath.Join(*projectPath, ".claude", "skills"), nil
	}
	return filepath.Join(h.claudeHome, "skills"), nil
}

// listSkillsFromDir reads all skill folders from the skills directory.
// Each skill is a directory containing a SKILL.md file.
func listSkillsFromDir(dir string) ([]SkillFile, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return []SkillFile{}, nil
		}
		return nil, fmt.Errorf("skills: cannot read dir %s: %w", dir, err)
	}

	var skills []SkillFile
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		folderName := entry.Name()
		skillMdPath := filepath.Join(dir, folderName, "SKILL.md")

		data, err := os.ReadFile(skillMdPath)
		if err != nil {
			// Folder without SKILL.md is not a skill.
			continue
		}

		doc, err := lib.ParseMarkdownFrontmatter(string(data))
		if err != nil {
			continue
		}

		name := folderName
		if n, ok := doc.Frontmatter["name"].(string); ok && n != "" {
			name = n
		}
		description := ""
		if d, ok := doc.Frontmatter["description"].(string); ok {
			description = d
		}

		skills = append(skills, SkillFile{
			Name:        name,
			Description: description,
			FolderName:  folderName,
			FilePath:    skillMdPath,
			BodyPreview: lib.TruncateBody(doc.Body, 5),
			IsEditable:  lib.IsUserOwned(skillMdPath),
		})
	}
	return skills, nil
}

// GetSkills lists all skills for the given scope.
func (h *FieldStationHandler) GetSkills(ctx context.Context, request GetSkillsRequestObject) (GetSkillsResponseObject, error) {
	scope := "global"
	if request.Params.Scope != nil {
		scope = string(*request.Params.Scope)
	}

	skillDir, err := h.resolveSkillDir(scope, request.Params.ProjectPath)
	if err != nil {
		return nil, err
	}

	skills, err := listSkillsFromDir(skillDir)
	if err != nil {
		return nil, err
	}
	if skills == nil {
		skills = []SkillFile{}
	}
	return GetSkills200JSONResponse(skills), nil
}

// GetSkill returns the detail of a single skill by folder name.
func (h *FieldStationHandler) GetSkill(ctx context.Context, request GetSkillRequestObject) (GetSkillResponseObject, error) {
	skillDir, err := h.resolveSkillDir(request.Scope, request.Params.ProjectPath)
	if err != nil {
		return nil, err
	}

	// The path param "name" is actually the folder name for skills.
	folderName := request.Name
	skillMdPath := filepath.Join(skillDir, folderName, "SKILL.md")

	// Validate that the resolved path stays within the skills directory.
	if _, err := lib.AssertSafePath(skillMdPath, []string{skillDir}); err != nil {
		return nil, fmt.Errorf("skills: unsafe path: %w", err)
	}

	data, err := os.ReadFile(skillMdPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("skill not found: %s", folderName)
		}
		return nil, fmt.Errorf("skills: cannot read %s: %w", skillMdPath, err)
	}

	doc, err := lib.ParseMarkdownFrontmatter(string(data))
	if err != nil {
		return nil, fmt.Errorf("skills: cannot parse frontmatter in %s: %w", skillMdPath, err)
	}

	name := folderName
	if n, ok := doc.Frontmatter["name"].(string); ok && n != "" {
		name = n
	}
	description := ""
	if d, ok := doc.Frontmatter["description"].(string); ok {
		description = d
	}

	return GetSkill200JSONResponse(SkillDetail{
		Name:        name,
		Description: description,
		FolderName:  folderName,
		FilePath:    skillMdPath,
		Body:        doc.Body,
		IsEditable:  lib.IsUserOwned(skillMdPath),
	}), nil
}

// CreateSkill creates a new skill folder with a SKILL.md file.
func (h *FieldStationHandler) CreateSkill(ctx context.Context, request CreateSkillRequestObject) (CreateSkillResponseObject, error) {
	if request.Body == nil {
		return nil, fmt.Errorf("request body is required")
	}
	body := request.Body

	skillDir, err := h.resolveSkillDir(string(body.Scope), body.ProjectPath)
	if err != nil {
		return nil, err
	}

	folderPath := filepath.Join(skillDir, body.Name)
	skillMdPath := filepath.Join(folderPath, "SKILL.md")

	if _, err := lib.AssertSafePath(skillMdPath, []string{skillDir}); err != nil {
		return nil, fmt.Errorf("skills: unsafe path: %w", err)
	}

	if !lib.IsUserOwned(skillMdPath) {
		return nil, fmt.Errorf("skills: cannot write plugin-managed file: %s", skillMdPath)
	}

	if err := os.MkdirAll(folderPath, 0o755); err != nil {
		return nil, fmt.Errorf("skills: cannot create folder %s: %w", folderPath, err)
	}

	// Build SKILL.md content with frontmatter.
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
	content := lib.SerializeMarkdown(fm)

	// Atomic create — fail if already exists.
	f, err := os.OpenFile(skillMdPath, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o644)
	if err != nil {
		if os.IsExist(err) {
			return nil, fmt.Errorf("skills: skill already exists: %s", body.Name)
		}
		return nil, fmt.Errorf("skills: cannot create %s: %w", skillMdPath, err)
	}
	if _, werr := f.WriteString(content); werr != nil {
		f.Close()
		os.Remove(skillMdPath)
		return nil, fmt.Errorf("skills: cannot write %s: %w", skillMdPath, werr)
	}
	if err := f.Close(); err != nil {
		os.Remove(skillMdPath)
		return nil, fmt.Errorf("skills: cannot close %s: %w", skillMdPath, err)
	}

	description := ""
	if body.Description != nil {
		description = *body.Description
	}

	return CreateSkill200JSONResponse(SkillFile{
		Name:        body.Name,
		Description: description,
		FolderName:  body.Name,
		FilePath:    skillMdPath,
		BodyPreview: lib.TruncateBody(body.Body, 5),
		IsEditable:  lib.IsUserOwned(skillMdPath),
	}), nil
}

// UpdateSkill updates an existing skill's SKILL.md file.
func (h *FieldStationHandler) UpdateSkill(ctx context.Context, request UpdateSkillRequestObject) (UpdateSkillResponseObject, error) {
	if request.Body == nil {
		return nil, fmt.Errorf("request body is required")
	}
	body := request.Body

	skillDir, err := h.resolveSkillDir(request.Scope, body.ProjectPath)
	if err != nil {
		return nil, err
	}

	folderName := request.Name
	skillMdPath := filepath.Join(skillDir, folderName, "SKILL.md")

	// Validate path safety.
	if _, err := lib.AssertSafePath(skillMdPath, lib.GetAllowedRoots("")); err != nil {
		return nil, err
	}

	// Build updated SKILL.md content.
	fm := lib.FrontmatterDoc{
		Frontmatter: map[string]any{},
		Body:        body.Body,
	}
	fm.Frontmatter["name"] = folderName
	if body.Description != nil && *body.Description != "" {
		fm.Frontmatter["description"] = *body.Description
	}
	content := lib.SerializeMarkdown(fm)

	lib.BackupFile(skillMdPath, lib.BackupOpUpdate, h.claudeHome)

	if err := lib.WriteFileAtomic(skillMdPath, []byte(content)); err != nil {
		return nil, fmt.Errorf("skills: cannot write %s: %w", skillMdPath, err)
	}

	description := ""
	if body.Description != nil {
		description = *body.Description
	}

	return UpdateSkill200JSONResponse(SkillDetail{
		Name:        folderName,
		Description: description,
		FolderName:  folderName,
		FilePath:    skillMdPath,
		Body:        body.Body,
		IsEditable:  lib.IsUserOwned(skillMdPath),
	}), nil
}

// DeleteSkill deletes a skill folder (including its SKILL.md).
func (h *FieldStationHandler) DeleteSkill(ctx context.Context, request DeleteSkillRequestObject) (DeleteSkillResponseObject, error) {
	skillDir, err := h.resolveSkillDir(request.Scope, request.Params.ProjectPath)
	if err != nil {
		return nil, err
	}

	folderName := request.Name
	folderPath := filepath.Join(skillDir, folderName)
	skillMdPath := filepath.Join(folderPath, "SKILL.md")

	// Validate path safety (check SKILL.md path specifically).
	if _, err := lib.AssertSafePath(folderPath, lib.GetAllowedRoots("")); err != nil {
		return nil, err
	}

	if _, err := os.Stat(skillMdPath); err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("skill not found: %s", folderName)
		}
		return nil, fmt.Errorf("skills: cannot stat %s: %w", skillMdPath, err)
	}

	lib.BackupFile(skillMdPath, lib.BackupOpDelete, h.claudeHome)

	// Remove the entire skill folder.
	if err := os.RemoveAll(folderPath); err != nil {
		return nil, fmt.Errorf("skills: cannot delete %s: %w", folderPath, err)
	}
	return DeleteSkill200JSONResponse(SuccessResponse{Success: true}), nil
}
