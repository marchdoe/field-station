import { describe, expect, it } from "vitest";
import { parseMarkdownFrontmatter, truncateBody } from "./markdown-parser.js";

describe("parseMarkdownFrontmatter", () => {
  it("parses frontmatter and body", () => {
    const content = `---
title: Hello
tags:
  - a
  - b
---
# Body content

Some text here.`;

    const result = parseMarkdownFrontmatter(content);
    expect(result.frontmatter).toEqual({ title: "Hello", tags: ["a", "b"] });
    expect(result.body).toBe("# Body content\n\nSome text here.");
  });

  it("returns empty frontmatter when none present", () => {
    const result = parseMarkdownFrontmatter("Just a plain body.");
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe("Just a plain body.");
  });

  it("trims whitespace from body", () => {
    const content = `---
key: value
---

  Some body
`;
    const result = parseMarkdownFrontmatter(content);
    expect(result.body).toBe("Some body");
  });

  it("handles empty content", () => {
    const result = parseMarkdownFrontmatter("");
    expect(result.frontmatter).toEqual({});
    expect(result.body).toBe("");
  });
});

describe("truncateBody", () => {
  it("returns body unchanged when under max lines", () => {
    const body = "line1\nline2\nline3";
    expect(truncateBody(body, 10)).toBe(body);
  });

  it("returns body unchanged when exactly at max lines", () => {
    const body = "1\n2\n3";
    expect(truncateBody(body, 3)).toBe(body);
  });

  it("truncates body over max lines and appends ellipsis", () => {
    const body = "1\n2\n3\n4\n5";
    expect(truncateBody(body, 3)).toBe("1\n2\n3\n...");
  });

  it("defaults to 10 lines", () => {
    const lines = Array.from({ length: 15 }, (_, i) => `line${i + 1}`);
    const result = truncateBody(lines.join("\n"));
    expect(result.split("\n")).toHaveLength(11); // 10 lines + "..."
    expect(result.endsWith("...")).toBe(true);
  });
});
