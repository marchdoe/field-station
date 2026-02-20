package lib

import (
	"fmt"
	"strings"

	"gopkg.in/yaml.v3"
)

// FrontmatterDoc holds the parsed frontmatter and body of a markdown document.
type FrontmatterDoc struct {
	Frontmatter map[string]any
	Body        string
}

// ParseMarkdownFrontmatter splits YAML frontmatter from the markdown body.
// If the content starts with "---\n", the text between the opening and closing
// "---" fences is parsed as YAML and returned in Frontmatter. Everything after
// the closing fence is returned as Body (trimmed of surrounding whitespace,
// matching gray-matter's body.trim() behaviour).
// If no frontmatter fence is present, Frontmatter is an empty map and Body is
// the full content.
func ParseMarkdownFrontmatter(content string) (FrontmatterDoc, error) {
	const fence = "---"
	const openFence = "---\n"

	if !strings.HasPrefix(content, openFence) {
		return FrontmatterDoc{
			Frontmatter: map[string]any{},
			Body:        content,
		}, nil
	}

	// Strip the opening fence line.
	rest := content[len(openFence):]

	// Find the closing fence: a line that is exactly "---" optionally followed
	// by "\n". We search line by line.
	closingStart := -1
	closingEnd := -1

	for i := 0; i < len(rest); {
		// Find the end of this line.
		nl := strings.IndexByte(rest[i:], '\n')
		var line string
		var lineEnd int
		if nl == -1 {
			line = rest[i:]
			lineEnd = len(rest)
		} else {
			line = rest[i : i+nl]
			lineEnd = i + nl + 1 // include the '\n'
		}

		if line == fence {
			closingStart = i
			closingEnd = lineEnd
			break
		}

		i = lineEnd
		if nl == -1 {
			break
		}
	}

	if closingStart == -1 {
		// No closing fence — treat as plain content.
		return FrontmatterDoc{
			Frontmatter: map[string]any{},
			Body:        content,
		}, nil
	}

	yamlContent := rest[:closingStart]
	afterFence := rest[closingEnd:]

	// gray-matter trims the body.
	body := strings.TrimSpace(afterFence)

	var fm map[string]any
	if strings.TrimSpace(yamlContent) == "" {
		fm = map[string]any{}
	} else {
		if err := yaml.Unmarshal([]byte(yamlContent), &fm); err != nil {
			return FrontmatterDoc{}, fmt.Errorf("markdownparser: invalid YAML frontmatter: %w", err)
		}
		if fm == nil {
			fm = map[string]any{}
		}
	}

	return FrontmatterDoc{
		Frontmatter: fm,
		Body:        body,
	}, nil
}

// SerializeMarkdown serializes a FrontmatterDoc back to a markdown string.
// If Frontmatter is empty or nil, only the Body is returned unchanged.
// Otherwise the output is: "---\n<yaml>---\n<body>".
func SerializeMarkdown(doc FrontmatterDoc) string {
	if len(doc.Frontmatter) == 0 {
		return doc.Body
	}

	yamlBytes, err := yaml.Marshal(doc.Frontmatter)
	if err != nil {
		// Fallback: return body only.
		return doc.Body
	}

	var sb strings.Builder
	sb.WriteString("---\n")
	sb.Write(yamlBytes)
	sb.WriteString("---\n")
	sb.WriteString(doc.Body)
	return sb.String()
}

// TruncateBody truncates a markdown body to at most maxLines lines.
// If the body has more lines than maxLines, it appends "..." on a new line.
// If maxLines is 0 or negative, an empty string is returned.
func TruncateBody(body string, maxLines int) string {
	if maxLines <= 0 {
		return ""
	}
	lines := strings.Split(body, "\n")
	if len(lines) <= maxLines {
		return body
	}
	return strings.Join(lines[:maxLines], "\n") + "\n..."
}
