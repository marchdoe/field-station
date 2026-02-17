import { ChevronDown, ChevronRight, File, Folder, FolderOpen } from "lucide-react";
import { useState } from "react";
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

function TreeNode({ item, depth = 0 }: { item: TreeItem; depth?: number }) {
  const [expanded, setExpanded] = useState(false);
  const isDirectory = item.type === "directory";
  const hasChildren = isDirectory && item.children && item.children.length > 0;

  return (
    <div>
      <button
        type="button"
        role="treeitem"
        aria-expanded={isDirectory ? expanded : undefined}
        onClick={() => {
          if (isDirectory) setExpanded((prev) => !prev);
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
            <TreeNode key={child.path} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ConfigTree({ items }: ConfigTreeProps) {
  return (
    <div role="tree" aria-label="File tree" className="space-y-0.5">
      {items.map((item) => (
        <TreeNode key={item.path} item={item} />
      ))}
    </div>
  );
}
