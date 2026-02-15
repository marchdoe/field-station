import matter from "gray-matter";

export interface ParsedMarkdown {
  frontmatter: Record<string, unknown>;
  body: string;
}

export function parseMarkdownFrontmatter(content: string): ParsedMarkdown {
  try {
    const { data, content: body } = matter(content);
    return { frontmatter: data, body: body.trim() };
  } catch {
    return { frontmatter: {}, body: content.trim() };
  }
}

export function truncateBody(body: string, maxLines: number = 10): string {
  const lines = body.split("\n");
  if (lines.length <= maxLines) return body;
  return `${lines.slice(0, maxLines).join("\n")}\n...`;
}
