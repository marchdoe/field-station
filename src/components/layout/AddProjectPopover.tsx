import { useQueryClient } from "@tanstack/react-query";
import { FolderOpen, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ScanProjectResult } from "@/lib/api.js";
import * as api from "@/lib/api.js";
import { cn } from "@/lib/utils.js";

const FOLDER_KEY = "field-station:projects-folder";

export function AddProjectPopover() {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<ScanProjectResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingPath, setAddingPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [popoverTop, setPopoverTop] = useState(0);
  const queryClient = useQueryClient();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const folder = localStorage.getItem(FOLDER_KEY) ?? "~/Projects";
  const unregistered = results.filter((r) => !r.registered);

  // Scan when popover opens
  useEffect(() => {
    if (!open) {
      setResults([]);
      setError(null);
      return;
    }
    setLoading(true);
    api
      .scanProjects(folder)
      .then(setResults)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Scan failed"))
      .finally(() => setLoading(false));
  }, [open, folder]);

  // Position popover aligned to trigger
  useEffect(() => {
    if (open && triggerRef.current) {
      setPopoverTop(triggerRef.current.getBoundingClientRect().top);
    }
  }, [open]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function handleAdd(path: string) {
    setAddingPath(path);
    try {
      await api.addProjects([path]);
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      setResults((prev) => prev.map((r) => (r.path === path ? { ...r, registered: true } : r)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add project");
    } finally {
      setAddingPath(null);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Add project"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer",
          "text-text-secondary hover:text-text-primary hover:bg-surface-2",
          open && "bg-surface-2 text-text-primary",
        )}
      >
        <Plus size={16} />
        <span>Add project</span>
      </button>

      {open && (
        <div
          ref={popoverRef}
          style={{ top: popoverTop, left: 240 }}
          className="fixed z-50 w-72 bg-surface-1 border border-border-default rounded-xl shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border-muted">
            <code className="text-xs bg-surface-2 px-1.5 py-0.5 rounded text-text-muted truncate">
              {folder}
            </code>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>

          {/* Body */}
          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-5 h-5 border-2 border-accent border-t-transparent rounded-full" />
              </div>
            )}

            {error && <p className="px-4 py-3 text-sm text-red-600">{error}</p>}

            {!loading && !error && unregistered.length === 0 && (
              <p className="px-4 py-8 text-sm text-text-muted text-center">
                All projects from this folder are already added.
              </p>
            )}

            {!loading &&
              !error &&
              unregistered.map((project) => (
                <button
                  key={project.path}
                  type="button"
                  onClick={() => void handleAdd(project.path)}
                  disabled={addingPath === project.path}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-2 transition-colors disabled:opacity-50 border-b border-border-muted last:border-0"
                >
                  <FolderOpen size={16} className="flex-shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-text-primary text-sm truncate">{project.name}</p>
                    <p className="text-xs text-text-muted truncate">{project.path}</p>
                  </div>
                  {addingPath === project.path && (
                    <div className="animate-spin w-3.5 h-3.5 border border-accent border-t-transparent rounded-full flex-shrink-0" />
                  )}
                </button>
              ))}
          </div>
        </div>
      )}
    </>
  );
}
