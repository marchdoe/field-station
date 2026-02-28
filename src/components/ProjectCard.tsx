import { useQueryClient } from "@tanstack/react-query";
import { FolderOpen, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import * as api from "@/lib/api.js";
import type { ProjectFile } from "@/lib/api.js";
import { encodePath, getProjectName } from "@/lib/utils.js";

interface ProjectCardProps {
  project: ProjectFile;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const name = getProjectName(project.path);
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const queryClient = useQueryClient();

  async function handleRemove() {
    setRemoving(true);
    try {
      await api.removeProject(encodePath(project.path));
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
    } catch {
      setRemoving(false);
      setConfirming(false);
    }
  }

  return (
    <div className="group relative bg-surface-1 border border-border-default rounded-xl p-4 hover:border-accent/40 transition-colors">
      <Link
        to={`/projects/${encodePath(project.path)}`}
        className="block"
      >
        <div className="flex items-center gap-3 mb-2">
          <FolderOpen className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-text-primary truncate">{name}</h3>
        </div>
        <p className="text-sm text-text-muted truncate">{project.path}</p>
      </Link>

      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Remove ${name}`}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex items-center justify-center w-5 h-5 rounded-full bg-surface-2 text-text-muted hover:bg-red-100 hover:text-red-600 transition-all"
      >
        <X className="w-3 h-3" />
      </button>

      {confirming && (
        <RemoveModal
          name={name}
          removing={removing}
          onConfirm={() => void handleRemove()}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

function RemoveModal({
  name,
  removing,
  onConfirm,
  onCancel,
}: {
  name: string;
  removing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-surface-1 border border-border-default rounded-xl p-6 max-w-sm w-full shadow-xl">
        <h2 className="text-lg font-semibold text-text-primary mb-2">Remove project?</h2>
        <p className="text-sm text-text-secondary mb-6">
          Are you sure you want to remove <strong>{name}</strong> from Field Station? This
          won&apos;t delete any files.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={removing}
            className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-2 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={removing}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {removing ? "Removing…" : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}
