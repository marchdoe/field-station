import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, FolderSearch, Radio } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { ScanProjectResult } from "@/lib/api.js";
import * as api from "@/lib/api.js";

const FOLDER_KEY = "field-station:projects-folder";

function getDefaultFolder(): string {
  const stored = localStorage.getItem(FOLDER_KEY);
  if (stored) return stored;
  return "~/Projects";
}

type Phase = "folder-pick" | "results" | "adding";

export function SetupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: api.getProjects,
  });

  const [phase, setPhase] = useState<Phase>("folder-pick");
  const [folder, setFolder] = useState<string>(getDefaultFolder);
  const [scanResults, setScanResults] = useState<ScanProjectResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scanError, setScanError] = useState<string | null>(null);

  const projectList = projects ?? [];

  useEffect(() => {
    if (!isLoading && projectList.length > 0) {
      void navigate("/");
    }
  }, [isLoading, projectList.length, navigate]);

  async function handleScan() {
    setScanError(null);
    localStorage.setItem(FOLDER_KEY, folder);
    try {
      const results = await api.scanProjects(folder);
      setScanResults(results);
      // Pre-check already-registered projects; leave unregistered unchecked.
      const registeredPaths = new Set(results.filter((r) => r.registered).map((r) => r.path));
      setSelected(registeredPaths);
      setPhase("results");
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Scan failed");
    }
  }

  async function handleAdd() {
    setPhase("adding");
    const paths = [...selected];
    try {
      await api.addProjects(paths);
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      void navigate("/");
    } catch (err) {
      setPhase("results");
      setScanError(err instanceof Error ? err.message : "Failed to add projects");
    }
  }

  function handleToggle(path: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  function handleSelectAllUnregistered() {
    const unregisteredPaths = scanResults.filter((r) => !r.registered).map((r) => r.path);
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of unregisteredPaths) {
        next.add(p);
      }
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <div className="animate-pulse text-text-muted">Loading...</div>
      </div>
    );
  }

  if (projectList.length > 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-muted mb-4">
            <Radio className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Add Your Projects</h1>
          <p className="text-text-secondary">
            Scan a folder to find projects where Claude has been used, then add them to Field
            Station.
          </p>
        </div>

        {scanError && (
          <div
            role="alert"
            className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
          >
            {scanError}
          </div>
        )}

        {phase === "folder-pick" && (
          <div className="bg-surface-1 border border-border-default rounded-xl p-6">
            <label
              htmlFor="folder-input"
              className="block text-sm font-medium text-text-secondary mb-2"
            >
              Projects folder
            </label>
            <div className="flex gap-3">
              <input
                id="folder-input"
                type="text"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                className="flex-1 px-3 py-2 bg-surface-0 border border-border-default rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="~/Projects"
              />
              <button
                type="button"
                onClick={() => void handleScan()}
                className="px-5 py-2 rounded-lg bg-accent text-white font-medium text-sm hover:bg-accent-hover"
              >
                Scan
              </button>
            </div>
          </div>
        )}

        {phase === "results" && (
          <>
            <div className="bg-surface-1 border border-border-default rounded-xl overflow-hidden mb-4">
              <div className="px-4 py-3 border-b border-border-muted flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderSearch className="w-4 h-4 text-text-muted" />
                  <span className="text-sm text-text-muted">
                    {scanResults.length} project{scanResults.length !== 1 ? "s" : ""} found in{" "}
                    <code className="text-xs bg-surface-2 px-1 py-0.5 rounded">{folder}</code>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSelectAllUnregistered}
                  className="text-xs text-accent hover:underline"
                >
                  Select all unregistered
                </button>
              </div>
              <div className="divide-y divide-border-muted max-h-96 overflow-y-auto">
                {scanResults.map((result) => (
                  <label
                    key={result.path}
                    className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-2"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(result.path)}
                      onChange={() => handleToggle(result.path)}
                      aria-label={result.name}
                    />
                    <FolderOpen className="w-4 h-4 flex-shrink-0 text-accent" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-text-primary truncate">{result.name}</p>
                      <p className="text-xs text-text-muted truncate">{result.path}</p>
                    </div>
                    {result.registered && (
                      <span className="text-xs text-text-muted">already added</span>
                    )}
                  </label>
                ))}
                {scanResults.length === 0 && (
                  <div className="px-4 py-8 text-center text-text-muted text-sm">
                    No projects with .claude/ found in this folder.
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPhase("folder-pick")}
                className="text-sm text-text-muted hover:text-text-primary"
              >
                ← Change folder
              </button>
              <button
                type="button"
                onClick={() => void handleAdd()}
                disabled={selected.size === 0}
                className="px-6 py-2.5 rounded-xl font-medium transition-colors bg-accent text-white hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add {selected.size} Selected Project{selected.size !== 1 ? "s" : ""}
              </button>
            </div>
          </>
        )}

        {phase === "adding" && (
          <div className="bg-surface-1 border border-border-default rounded-xl p-8 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-text-secondary text-sm">Adding projects...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
