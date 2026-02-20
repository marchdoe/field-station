package lib

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// ResourceType identifies which category of markdown resource to operate on.
type ResourceType string

const (
	ResourceTypeAgent   ResourceType = "agent"
	ResourceTypeCommand ResourceType = "command"
	ResourceTypeSkill   ResourceType = "skill"
)

// ResourceFile represents a single parsed markdown resource file.
type ResourceFile struct {
	ID          string         // filename without .md extension
	Name        string         // display name from frontmatter "name", or ID if absent
	Description string         // from frontmatter "description" field
	Content     string         // full raw markdown content
	Frontmatter map[string]any // parsed frontmatter
	Body        string         // markdown body (no frontmatter)
	FilePath    string         // absolute filesystem path
}

// ResolveResourceDir returns the directory where resources of the given type
// are stored under claudeHome.
func ResolveResourceDir(resourceType ResourceType, claudeHome string) string {
	switch resourceType {
	case ResourceTypeAgent:
		return filepath.Join(claudeHome, "agents")
	case ResourceTypeCommand:
		return filepath.Join(claudeHome, "commands")
	case ResourceTypeSkill:
		return filepath.Join(claudeHome, "skills")
	default:
		return filepath.Join(claudeHome, string(resourceType)+"s")
	}
}

// parseResourceFile reads a file at filePath, parses it, and constructs a
// ResourceFile. id is the filename without the .md extension.
func parseResourceFile(id, filePath string) (ResourceFile, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return ResourceFile{}, fmt.Errorf("resourcewriter: cannot read %s: %w", filePath, err)
	}
	content := string(data)

	doc, err := ParseMarkdownFrontmatter(content)
	if err != nil {
		return ResourceFile{}, fmt.Errorf("resourcewriter: cannot parse frontmatter in %s: %w", filePath, err)
	}

	name := id
	if n, ok := doc.Frontmatter["name"]; ok {
		if ns, ok := n.(string); ok && ns != "" {
			name = ns
		}
	}

	description := ""
	if d, ok := doc.Frontmatter["description"]; ok {
		if ds, ok := d.(string); ok {
			description = ds
		}
	}

	return ResourceFile{
		ID:          id,
		Name:        name,
		Description: description,
		Content:     content,
		Frontmatter: doc.Frontmatter,
		Body:        doc.Body,
		FilePath:    filePath,
	}, nil
}

// ListResources returns all .md files in the resource directory, sorted by
// filename. If the directory does not exist, an empty slice is returned (not
// an error).
func ListResources(resourceType ResourceType, claudeHome string) ([]ResourceFile, error) {
	dir := ResolveResourceDir(resourceType, claudeHome)

	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return []ResourceFile{}, nil
		}
		return nil, fmt.Errorf("resourcewriter: cannot read directory %s: %w", dir, err)
	}

	// Collect only .md filenames so we can sort them deterministically.
	var mdNames []string
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		if strings.HasSuffix(entry.Name(), ".md") {
			mdNames = append(mdNames, entry.Name())
		}
	}
	sort.Strings(mdNames)

	result := make([]ResourceFile, 0, len(mdNames))
	for _, name := range mdNames {
		id := strings.TrimSuffix(name, ".md")
		filePath := filepath.Join(dir, name)
		rf, err := parseResourceFile(id, filePath)
		if err != nil {
			return nil, err
		}
		result = append(result, rf)
	}
	return result, nil
}

// GetResource retrieves a single resource by its ID (filename without .md).
// Returns an error if the file does not exist.
func GetResource(resourceType ResourceType, id string, claudeHome string) (ResourceFile, error) {
	dir := ResolveResourceDir(resourceType, claudeHome)
	filePath := filepath.Join(dir, id+".md")

	if _, err := os.Stat(filePath); err != nil {
		if os.IsNotExist(err) {
			return ResourceFile{}, fmt.Errorf("resourcewriter: resource not found: %s", filePath)
		}
		return ResourceFile{}, fmt.Errorf("resourcewriter: cannot stat %s: %w", filePath, err)
	}

	return parseResourceFile(id, filePath)
}

// CreateResource creates a new resource file with the given content. Returns
// an error if the file already exists. Creates the parent directory if needed.
func CreateResource(resourceType ResourceType, id string, content string, claudeHome string) (ResourceFile, error) {
	dir := ResolveResourceDir(resourceType, claudeHome)
	filePath := filepath.Join(dir, id+".md")

	if _, err := os.Stat(filePath); err == nil {
		return ResourceFile{}, fmt.Errorf("resourcewriter: resource already exists: %s", filePath)
	}

	if err := os.MkdirAll(dir, 0o755); err != nil {
		return ResourceFile{}, fmt.Errorf("resourcewriter: cannot create directory %s: %w", dir, err)
	}

	if err := WriteFileAtomic(filePath, []byte(content)); err != nil {
		return ResourceFile{}, fmt.Errorf("resourcewriter: cannot write %s: %w", filePath, err)
	}

	return parseResourceFile(id, filePath)
}

// UpdateResource updates an existing resource file. Backs up the file before
// writing. Returns an error if the file does not exist.
func UpdateResource(resourceType ResourceType, id string, content string, claudeHome string) (ResourceFile, error) {
	dir := ResolveResourceDir(resourceType, claudeHome)
	filePath := filepath.Join(dir, id+".md")

	if _, err := os.Stat(filePath); err != nil {
		if os.IsNotExist(err) {
			return ResourceFile{}, fmt.Errorf("resourcewriter: resource not found: %s", filePath)
		}
		return ResourceFile{}, fmt.Errorf("resourcewriter: cannot stat %s: %w", filePath, err)
	}

	BackupFile(filePath, BackupOpUpdate, claudeHome)

	if err := WriteFileAtomic(filePath, []byte(content)); err != nil {
		return ResourceFile{}, fmt.Errorf("resourcewriter: cannot write %s: %w", filePath, err)
	}

	return parseResourceFile(id, filePath)
}

// DeleteResource deletes a resource file. Backs up the file before deleting.
// Returns an error if the file does not exist.
func DeleteResource(resourceType ResourceType, id string, claudeHome string) error {
	dir := ResolveResourceDir(resourceType, claudeHome)
	filePath := filepath.Join(dir, id+".md")

	if _, err := os.Stat(filePath); err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("resourcewriter: resource not found: %s", filePath)
		}
		return fmt.Errorf("resourcewriter: cannot stat %s: %w", filePath, err)
	}

	BackupFile(filePath, BackupOpDelete, claudeHome)

	if err := os.Remove(filePath); err != nil {
		return fmt.Errorf("resourcewriter: cannot delete %s: %w", filePath, err)
	}

	return nil
}
