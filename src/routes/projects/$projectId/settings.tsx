import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { useState } from "react";
import { LayerBadge } from "@/components/config/LayerBadge.js";
import { SettingsViewer } from "@/components/config/SettingsViewer.js";
import { CodeViewer } from "@/components/files/CodeViewer.js";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog.js";
import { ViewToggle } from "@/components/ui/ViewToggle.js";
import { type ConfirmState, useSettingsMutations } from "@/lib/useSettingsMutations.js";
import { decodePath } from "@/lib/utils.js";
import { getProjectSettings, getProjectSettingsLocal } from "@/server/functions/config.js";
import type { ConfigLayer, ConfigLayerSource, JsonValue } from "@/types/config.js";

export const Route = createFileRoute("/projects/$projectId/settings")({
  head: () => ({
    meta: [{ title: "Project Settings - Field Station" }],
  }),
  loader: async ({ params }) => {
    const projectPath = decodePath(params.projectId);
    const [project, projectLocal] = await Promise.all([
      getProjectSettings({ data: { projectPath } }),
      getProjectSettingsLocal({ data: { projectPath } }),
    ]);
    return { layers: [project, projectLocal], projectPath };
  },
  component: ProjectSettingsPage,
  pendingComponent: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-pulse text-text-muted">Loading settings...</div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
      <p className="text-danger font-medium">Failed to load settings</p>
      <p className="text-text-muted text-sm mt-1">{(error as Error).message}</p>
    </div>
  ),
});

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
      {layer.exists && layer.content ? (
        <div className="ml-7">
          <div className="mb-2">
            <ViewToggle view={view} onChange={setView} />
          </div>
          {view === "structured" ? (
            <SettingsViewer
              settings={layer.content}
              source={layer.source}
              editable={editable}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onMove={onMove}
              onAdd={onAdd}
            />
          ) : (
            <CodeViewer code={JSON.stringify(layer.content, null, 2)} language="json" />
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

function ProjectSettingsPage() {
  const { layers, projectPath } = Route.useLoaderData();
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const { createHandlers } = useSettingsMutations(projectPath, setConfirmState);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Project Configuration</h2>
        <div className="space-y-4">
          {layers.map((layer) => {
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
