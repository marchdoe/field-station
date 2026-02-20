package lib_test

import (
	"testing"

	"fieldstation/lib"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseMarkdown_NoFrontmatter(t *testing.T) {
	content := "# Hello World\n\nThis is a markdown document."
	doc, err := lib.ParseMarkdownFrontmatter(content)
	require.NoError(t, err)
	assert.Empty(t, doc.Frontmatter, "frontmatter should be empty when no --- fence")
	assert.Equal(t, content, doc.Body)
}

func TestParseMarkdown_WithFrontmatter(t *testing.T) {
	content := "---\ntitle: My Document\nauthor: Alice\n---\n# Body Content\n\nSome text here."
	doc, err := lib.ParseMarkdownFrontmatter(content)
	require.NoError(t, err)
	assert.Equal(t, "My Document", doc.Frontmatter["title"])
	assert.Equal(t, "Alice", doc.Frontmatter["author"])
	assert.Equal(t, "# Body Content\n\nSome text here.", doc.Body)
}

func TestParseMarkdown_FrontmatterTypes(t *testing.T) {
	content := "---\ncount: 42\nenabled: true\ntags:\n  - go\n  - yaml\n---\nBody text."
	doc, err := lib.ParseMarkdownFrontmatter(content)
	require.NoError(t, err)
	assert.Equal(t, 42, doc.Frontmatter["count"])
	assert.Equal(t, true, doc.Frontmatter["enabled"])
	tags, ok := doc.Frontmatter["tags"].([]any)
	require.True(t, ok, "tags should be a slice")
	assert.Equal(t, []any{"go", "yaml"}, tags)
	assert.Equal(t, "Body text.", doc.Body)
}

func TestParseMarkdown_EmptyFrontmatter(t *testing.T) {
	content := "---\n---\n"
	doc, err := lib.ParseMarkdownFrontmatter(content)
	require.NoError(t, err)
	assert.Empty(t, doc.Frontmatter, "frontmatter should be empty for empty fence")
	assert.Equal(t, "", doc.Body)
}

func TestSerializeMarkdown_WithFrontmatter(t *testing.T) {
	original := "---\ntitle: Round Trip\n---\nBody content here."
	doc, err := lib.ParseMarkdownFrontmatter(original)
	require.NoError(t, err)

	serialized := lib.SerializeMarkdown(doc)

	// Re-parse to verify round-trip
	doc2, err := lib.ParseMarkdownFrontmatter(serialized)
	require.NoError(t, err)
	assert.Equal(t, doc.Frontmatter["title"], doc2.Frontmatter["title"])
	assert.Equal(t, doc.Body, doc2.Body)
}

func TestSerializeMarkdown_EmptyFrontmatter(t *testing.T) {
	doc := lib.FrontmatterDoc{
		Frontmatter: map[string]any{},
		Body:        "Just a body, no frontmatter.",
	}
	result := lib.SerializeMarkdown(doc)
	assert.Equal(t, "Just a body, no frontmatter.", result, "should return body unchanged when frontmatter is empty")
	assert.NotContains(t, result, "---", "should not contain --- fence when frontmatter is empty")
}

func TestSerializeMarkdown_NilFrontmatter(t *testing.T) {
	doc := lib.FrontmatterDoc{
		Frontmatter: nil,
		Body:        "No frontmatter at all.",
	}
	result := lib.SerializeMarkdown(doc)
	assert.Equal(t, "No frontmatter at all.", result)
}

func TestParseMarkdown_BodyTrimmedLeadingNewline(t *testing.T) {
	// After closing ---, there may be a newline before the body
	content := "---\nkey: val\n---\n\nParagraph after blank line."
	doc, err := lib.ParseMarkdownFrontmatter(content)
	require.NoError(t, err)
	// Body should be trimmed of the leading newline
	assert.Equal(t, "Paragraph after blank line.", doc.Body)
}

func TestTruncateBody_ShortBody(t *testing.T) {
	body := "line1\nline2\nline3"
	result := lib.TruncateBody(body, 10)
	assert.Equal(t, body, result, "short body should be returned unchanged")
}

func TestTruncateBody_LongBody(t *testing.T) {
	lines := make([]string, 15)
	for i := range lines {
		lines[i] = "line"
	}
	body := "line\nline\nline\nline\nline\nline\nline\nline\nline\nline\nline\nline\nline\nline\nline"
	result := lib.TruncateBody(body, 10)
	assert.Equal(t, "line\nline\nline\nline\nline\nline\nline\nline\nline\nline\n...", result)
}

func TestTruncateBody_DefaultMaxLines(t *testing.T) {
	// Default is 10 lines
	body := "1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11"
	result := lib.TruncateBody(body, 10)
	assert.Equal(t, "1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n...", result)
}
