import { ArrowRightLeft, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ConfigLayerSource } from "@/types/config.js";

const LAYER_LABELS: Record<ConfigLayerSource, string> = {
  global: "Global",
  "global-local": "Global Local",
  project: "Project",
  "project-local": "Project Local",
};

const ALL_LAYERS: ConfigLayerSource[] = ["global", "global-local", "project", "project-local"];

interface SettingActionsProps {
  currentLayer: ConfigLayerSource;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (targetLayer: ConfigLayerSource) => void;
  showMove?: boolean;
}

export function SettingActions({
  currentLayer,
  onEdit,
  onDelete,
  onMove,
  showMove = true,
}: SettingActionsProps) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const availableLayers = ALL_LAYERS.filter((l) => l !== currentLayer);

  return (
    <span className="inline-flex items-center gap-0.5 opacity-0 group-hover/setting:opacity-100 transition-opacity ml-2">
      <button
        type="button"
        onClick={onEdit}
        title="Edit value"
        className="p-1 rounded hover:bg-surface-2 text-text-muted hover:text-accent transition-colors"
      >
        <Pencil className="w-3 h-3" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        title="Delete setting"
        className="p-1 rounded hover:bg-surface-2 text-text-muted hover:text-danger transition-colors"
      >
        <Trash2 className="w-3 h-3" />
      </button>
      {showMove && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMoveMenu((prev) => !prev)}
            title="Move to another layer"
            className="p-1 rounded hover:bg-surface-2 text-text-muted hover:text-accent transition-colors"
          >
            <ArrowRightLeft className="w-3 h-3" />
          </button>
          {showMoveMenu && (
            <div className="absolute top-full right-0 mt-1 bg-surface-1 border border-border-default rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
              {availableLayers.map((layer) => (
                <button
                  type="button"
                  key={layer}
                  onClick={() => {
                    setShowMoveMenu(false);
                    onMove(layer);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-2 transition-colors"
                >
                  {LAYER_LABELS[layer]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </span>
  );
}
