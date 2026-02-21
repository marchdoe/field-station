import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";
import { LayerBadge } from "@/components/config/LayerBadge.js";
import { SettingsViewer } from "@/components/config/SettingsViewer.js";
import { CodeViewer } from "@/components/files/CodeViewer.js";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog.js";
import { ViewToggle } from "@/components/ui/ViewToggle.js";
import type { ConfigLayer, ConfigLayerSource } from "@/lib/api.js";
import * as api from "@/lib/api.js";
import { type ConfirmState, useSettingsMutations } from "@/lib/useSettingsMutations.js";
import type { JsonObject, JsonValue } from "@/types/config.js";

interface LayerSectionProps {
  layer: ConfigLayer;
  editable?: boolean;
  onUpdate?: (keyPath: string, value: JsonValue) => void;
  onDelete?: (keyPath: string) => void;
  onMove?: (keyPath: string, targetLayer: ConfigLayerSource) => void;
  onAdd?: (keyPath: string, value: JsonValue) => void;
}

function LayerSection({ layer, editable, onUpdate, onDelete, onMove, onAdd }: LayerSectionProps) {
  const [view, setView] = useState<"structured" | "raw">("structured");
  const content = layer.content as JsonObject | null | undefined;

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <FileText className="w-4 h-4 text-text-muted" />
        <span className="text-sm font-medium text-text-primary">{layer.filePath}</span>
        <LayerBadge source={layer.source} />
        {!layer.exists && (
          <span className="text-xs text-text-muted bg-surface-2 px-2 py-0.5 rounded-full">
            Not found
          </span>
        )}
      </div>
      {layer.exists && content ? (
        <div className="ml-7">
          <div className="mb-2">
            <ViewToggle view={view} onChange={setView} />
          </div>
          {view === "structured" ? (
            <SettingsViewer
              settings={content}
              source={layer.source}
              editable={editable}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onMove={onMove}
              onAdd={onAdd}
            />
          ) : (
            <CodeViewer code={JSON.stringify(content, null, 2)} language="json" />
          )}
        </div>
      ) : (
        <div className="ml-7">
          <SettingsViewer
            settings={{}}
            source={layer.source}
            editable={editable}
            onUpdate={onUpdate}
            onAdd={onAdd}
          />
        </div>
      )}
    </div>
  );
}

export function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const { createHandlers } = useSettingsMutations(projectId ?? "", setConfirmState);

  const { data, isLoading } = useQuery({
    queryKey: ["config", projectId],
    queryFn: () => api.getConfig(projectId ?? ""),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-text-muted">Loading settings...</div>
      </div>
    );
  }

  const layers = data?.layers ?? [];
  const projectLayers = layers.filter(
    (l) => l.source === "project" || l.source === "project-local",
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Project Configuration</h2>
        <div className="space-y-4">
          {projectLayers.map((layer) => {
            const handlers = createHandlers(layer.source);
            return (
              <LayerSection
                key={layer.source}
                layer={layer}
                editable
                onUpdate={handlers.onUpdate}
                onDelete={handlers.onDelete}
                onMove={handlers.onMove}
                onAdd={handlers.onAdd}
              />
            );
          })}
        </div>
      </div>

      {confirmState && (
        <ConfirmDialog
          open={confirmState.open}
          title={confirmState.title}
          message={confirmState.message}
          variant="danger"
          confirmLabel="Confirm"
          onConfirm={async () => {
            await confirmState.action();
            setConfirmState(null);
          }}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
}
