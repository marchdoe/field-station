import { createHighlighter, type Highlighter } from "shiki";

let highlighter: Highlighter | null = null;
let initializing: Promise<Highlighter> | null = null;

export async function getHighlighter(): Promise<Highlighter> {
  if (highlighter) return highlighter;
  if (!initializing) {
    initializing = createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: [],
    });
    highlighter = await initializing;
    initializing = null;
  } else {
    highlighter = await initializing;
  }
  return highlighter;
}
