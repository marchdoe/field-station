import { useRouter } from "@tanstack/react-router";
import {
  Bot,
  type LucideIcon,
  Puzzle,
  Search,
  Settings,
  Sparkles,
  Terminal,
  Webhook,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { searchAll } from "@/server/functions/search.js";
import type { SearchResult } from "@/types/config.js";

const TYPE_ORDER = ["agent", "command", "skill", "settings-key", "feature", "hook", "plugin"];

const TYPE_LABELS: Record<string, string> = {
  agent: "Agents",
  command: "Commands",
  skill: "Skills",
  "settings-key": "Settings",
  feature: "Features",
  hook: "Hooks",
  plugin: "Plugins",
};

const MAX_PER_GROUP = 8;

const ICON_MAP: Record<string, LucideIcon> = {
  Bot,
  Terminal,
  Zap,
  Sparkles,
  Puzzle,
  Webhook,
  Settings,
};

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [allResults, setAllResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Open / close dialog following ConfirmDialog pattern
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  // On open: fetch data, reset state, auto-focus input
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedIndex(0);
    setLoading(true);
    searchAll().then((results) => {
      setAllResults(results);
      setLoading(false);
    });
    // Auto-focus the input after dialog opens
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [open]);

  // Filter and group results
  const filtered = useMemo(() => {
    if (!query) return allResults;
    const lower = query.toLowerCase();
    const matches = allResults.filter((r) => r.matchText.includes(lower));
    // Rank: title matches above non-title matches
    matches.sort((a, b) => {
      const aTitle = a.title.toLowerCase().includes(lower) ? 0 : 1;
      const bTitle = b.title.toLowerCase().includes(lower) ? 0 : 1;
      return aTitle - bTitle;
    });
    return matches;
  }, [allResults, query]);

  const groups = useMemo(() => {
    const grouped: { type: string; label: string; items: SearchResult[] }[] = [];
    for (const type of TYPE_ORDER) {
      const items = filtered.filter((r) => r.type === type).slice(0, MAX_PER_GROUP);
      if (items.length > 0) {
        grouped.push({ type, label: TYPE_LABELS[type] ?? type, items });
      }
    }
    return grouped;
  }, [filtered]);

  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  // Scroll selected item into view
  // biome-ignore lint/correctness/useExhaustiveDependencies: must re-run when selectedIndex changes to scroll the newly selected item
  useEffect(() => {
    const el = dialogRef.current?.querySelector("[data-selected='true']");
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  function navigateToResult(result: SearchResult) {
    router.navigate({ to: result.href });
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < flatItems.length ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const result = flatItems[selectedIndex];
      if (result) {
        navigateToResult(result);
      }
    }
  }

  // Reset selected index when filtered results change
  // biome-ignore lint/correctness/useExhaustiveDependencies: must re-run when filtered array identity changes to reset selection
  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered]);

  let flatIndex = -1;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-label="Search"
      className="m-auto backdrop:bg-black/50 bg-surface-1 border border-border-default rounded-xl p-0 max-w-xl w-full shadow-xl"
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: keyboard navigation wrapper for command palette */}
      <div onKeyDown={handleKeyDown}>
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border-default">
          <Search className="w-4 h-4 text-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search agents, commands, skills, settings..."
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={flatItems.length > 0}
            aria-controls="command-palette-listbox"
            aria-activedescendant={
              flatItems.length > 0 ? `command-palette-option-${selectedIndex}` : undefined
            }
            aria-label="Search agents, commands, skills, settings"
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
          <kbd className="text-[10px] text-text-muted bg-surface-2 border border-border-default rounded px-1.5 py-0.5 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results area */}
        <div
          role="listbox"
          id="command-palette-listbox"
          aria-label="Search results"
          className="overflow-y-auto"
          style={{ maxHeight: "400px" }}
        >
          {loading ? (
            <div className="px-4 py-8 text-sm text-text-muted text-center animate-pulse">
              Loading...
            </div>
          ) : flatItems.length === 0 && query ? (
            <div className="px-4 py-8 text-sm text-text-muted text-center">No results found</div>
          ) : flatItems.length === 0 ? (
            <div className="px-4 py-8 text-sm text-text-muted text-center">No resources found</div>
          ) : (
            groups.map((group) => (
              <div key={group.type}>
                <div className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  {group.label}
                </div>
                {group.items.map((result) => {
                  flatIndex++;
                  const isSelected = flatIndex === selectedIndex;
                  const IconComponent = ICON_MAP[result.icon];
                  const currentFlatIndex = flatIndex;
                  return (
                    <button
                      key={`${result.type}-${result.href}`}
                      type="button"
                      role="option"
                      id={`command-palette-option-${currentFlatIndex}`}
                      aria-selected={isSelected}
                      data-selected={isSelected}
                      onClick={() => navigateToResult(result)}
                      onMouseEnter={() => setSelectedIndex(currentFlatIndex)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                        isSelected
                          ? "bg-surface-2 text-text-primary"
                          : "text-text-secondary hover:bg-surface-2"
                      }`}
                    >
                      {IconComponent ? (
                        <IconComponent className="w-4 h-4 shrink-0 text-text-muted" />
                      ) : (
                        <Search className="w-4 h-4 shrink-0 text-text-muted" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{result.title}</div>
                        {result.description && (
                          <div className="text-xs text-text-muted truncate">
                            {result.description}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-text-muted bg-surface-2 border border-border-default rounded px-1.5 py-0.5 shrink-0">
                        {result.scope === "project" && result.projectName
                          ? result.projectName
                          : "global"}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer with keyboard hints */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border-default text-[11px] text-text-muted">
          <span className="flex items-center gap-1">
            <kbd className="bg-surface-2 border border-border-default rounded px-1 py-0.5 font-mono text-[10px]">
              &uarr;&darr;
            </kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-surface-2 border border-border-default rounded px-1 py-0.5 font-mono text-[10px]">
              &crarr;
            </kbd>
            open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-surface-2 border border-border-default rounded px-1 py-0.5 font-mono text-[10px]">
              esc
            </kbd>
            close
          </span>
        </div>
      </div>
    </dialog>
  );
}
