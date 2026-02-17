import { ChevronDown, ChevronRight, File, Folder, FolderOpen } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TreeItem {
  name: string;
  type: "file" | "directory";
  path: string;
  children?: TreeItem[];
}

interface ConfigTreeProps {
  items: TreeItem[];
}

function getVisiblePaths(items: TreeItem[], expandedSet: Set<string>): string[] {
  const paths: string[] = [];
  for (const item of items) {
    paths.push(item.path);
    if (item.type === "directory" && expandedSet.has(item.path) && item.children) {
      paths.push(...getVisiblePaths(item.children, expandedSet));
    }
  }
  return paths;
}

function findItem(items: TreeItem[], path: string): TreeItem | undefined {
  for (const item of items) {
    if (item.path === path) return item;
    if (item.children) {
      const found = findItem(item.children, path);
      if (found) return found;
    }
  }
  return undefined;
}

function TreeNode({
  item,
  depth = 0,
  expandedSet,
  focusedPath,
  onToggle,
  onFocusChange,
}: {
  item: TreeItem;
  depth?: number;
  expandedSet: Set<string>;
  focusedPath: string | null;
  onToggle: (path: string) => void;
  onFocusChange: (path: string) => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const isDirectory = item.type === "directory";
  const expanded = isDirectory && expandedSet.has(item.path);
  const hasChildren = isDirectory && item.children && item.children.length > 0;
  const isFocused = focusedPath === item.path;

  useEffect(() => {
    if (isFocused) btnRef.current?.focus();
  }, [isFocused]);

  return (
    <div>
      <button
        ref={btnRef}
        type="button"
        role="treeitem"
        aria-expanded={isDirectory ? expanded : undefined}
        tabIndex={isFocused ? 0 : -1}
        onClick={() => {
          onFocusChange(item.path);
          if (isDirectory) onToggle(item.path);
        }}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-sm text-text-secondary transition-colors",
          isDirectory ? "cursor-pointer hover:bg-surface-2" : "cursor-default hover:bg-surface-2",
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {isDirectory ? (
          <>
            {expanded ? (
              <ChevronDown size={14} className="shrink-0 text-text-muted" />
            ) : (
              <ChevronRight size={14} className="shrink-0 text-text-muted" />
            )}
            {expanded ? (
              <FolderOpen size={16} className="shrink-0 text-accent" />
            ) : (
              <Folder size={16} className="shrink-0 text-accent" />
            )}
          </>
        ) : (
          <>
            <span className="inline-block w-3.5 shrink-0" />
            <File size={16} className="shrink-0 text-text-muted" />
          </>
        )}
        <span className="truncate">{item.name}</span>
      </button>

      {expanded && hasChildren && (
        // biome-ignore lint/a11y/useSemanticElements: role="group" on div is correct for tree widget children
        <div role="group">
          {item.children?.map((child) => (
            <TreeNode
              key={child.path}
              item={child}
              depth={depth + 1}
              expandedSet={expandedSet}
              focusedPath={focusedPath}
              onToggle={onToggle}
              onFocusChange={onFocusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ConfigTree({ items }: ConfigTreeProps) {
  const [expandedSet, setExpandedSet] = useState<Set<string>>(new Set());
  const [focusedPath, setFocusedPath] = useState<string | null>(null);

  const toggleExpanded = useCallback((path: string) => {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const visiblePaths = getVisiblePaths(items, expandedSet);
      const idx = focusedPath ? visiblePaths.indexOf(focusedPath) : -1;
      if (idx === -1 && visiblePaths.length === 0) return;

      const currentItem = focusedPath ? findItem(items, focusedPath) : undefined;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (idx < visiblePaths.length - 1) setFocusedPath(visiblePaths[idx + 1]);
          break;
        case "ArrowUp":
          e.preventDefault();
          if (idx > 0) setFocusedPath(visiblePaths[idx - 1]);
          break;
        case "ArrowRight":
          e.preventDefault();
          if (currentItem?.type === "directory") {
            if (!expandedSet.has(currentItem.path)) {
              toggleExpanded(currentItem.path);
            } else if (currentItem.children?.[0]) {
              setFocusedPath(currentItem.children[0].path);
            }
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (currentItem?.type === "directory" && expandedSet.has(currentItem.path)) {
            toggleExpanded(currentItem.path);
          }
          break;
        case "Home":
          e.preventDefault();
          if (visiblePaths.length > 0) setFocusedPath(visiblePaths[0]);
          break;
        case "End":
          e.preventDefault();
          if (visiblePaths.length > 0) setFocusedPath(visiblePaths[visiblePaths.length - 1]);
          break;
      }
    },
    [items, expandedSet, focusedPath, toggleExpanded],
  );

  return (
    <div className="space-y-0.5" role="tree" aria-label="File tree" onKeyDown={handleKeyDown}>
      {items.map((item) => (
        <TreeNode
          key={item.path}
          item={item}
          expandedSet={expandedSet}
          focusedPath={focusedPath}
          onToggle={toggleExpanded}
          onFocusChange={setFocusedPath}
        />
      ))}
    </div>
  );
}
