import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { LayerBadge } from "@/components/config/LayerBadge.js";
import { SettingsViewer } from "@/components/config/SettingsViewer.js";
import { AppShell } from "@/components/layout/AppShell.js";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog.js";
import * as api from "@/lib/api.js";
import { type ConfirmState, useSettingsMutations } from "@/lib/useSettingsMutations.js";
import type { JsonObject } from "@/types/config.js";

export function GlobalSettingsPage() {
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const { createHandlers } = useSettingsMutations(undefined, setConfirmState);

  const { data, isLoading, error } = useQuery({
    queryKey: ["config", "global"],
    queryFn: () => api.getConfig(),
  });

  const globalHandlers = createHandlers("global");
  const globalLocalHandlers = createHandlers("global-local");

  if (isLoading) {
    return (
      <AppShell title="Global Settings">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-text-muted">Loading settings...</div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Global Settings">
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
          <p className="text-danger font-medium">Failed to load settings</p>
          <p className="text-text-muted text-sm mt-1">
            {error instanceof Error ? error.message : String(error)}
          </p>
        </div>
      </AppShell>
    );
  }

  const globalLayer = data?.layers.find((l) => l.source === "global");
  const globalLocalLayer = data?.layers.find((l) => l.source === "global-local");

  return (
    <AppShell title="Global Settings">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Global Settings</h1>
          <p className="text-text-secondary mt-1">
            Configuration from{" "}
            <code className="text-sm bg-surface-2 px-1.5 py-0.5 rounded">
              ~/.claude/settings.json
            </code>{" "}
            and{" "}
            <code className="text-sm bg-surface-2 px-1.5 py-0.5 rounded">settings.local.json</code>
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-lg font-semibold text-text-primary">settings.json</h2>
              <LayerBadge source="global" />
              {globalLayer && !globalLayer.exists && (
                <span className="text-xs text-text-muted bg-surface-2 px-2 py-0.5 rounded-full">
                  Not found
                </span>
              )}
            </div>
            {globalLayer?.exists && globalLayer.content ? (
              <SettingsViewer
                settings={globalLayer.content as unknown as JsonObject}
                source="global"
                editable
                onUpdate={globalHandlers.onUpdate}
                onDelete={globalHandlers.onDelete}
                onMove={globalHandlers.onMove}
                onAdd={globalHandlers.onAdd}
              />
            ) : (
              <SettingsViewer
                settings={{}}
                source="global"
                editable
                onUpdate={globalHandlers.onUpdate}
                onAdd={globalHandlers.onAdd}
              />
            )}
          </div>

          <div>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-lg font-semibold text-text-primary">settings.local.json</h2>
              <LayerBadge source="global-local" />
              {globalLocalLayer && !globalLocalLayer.exists && (
                <span className="text-xs text-text-muted bg-surface-2 px-2 py-0.5 rounded-full">
                  Not found
                </span>
              )}
            </div>
            {globalLocalLayer?.exists && globalLocalLayer.content ? (
              <SettingsViewer
                settings={globalLocalLayer.content as unknown as JsonObject}
                source="global-local"
                editable
                onUpdate={globalLocalHandlers.onUpdate}
                onDelete={globalLocalHandlers.onDelete}
                onMove={globalLocalHandlers.onMove}
                onAdd={globalLocalHandlers.onAdd}
              />
            ) : (
              <SettingsViewer
                settings={{}}
                source="global-local"
                editable
                onUpdate={globalLocalHandlers.onUpdate}
                onAdd={globalLocalHandlers.onAdd}
              />
            )}
          </div>
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
    </AppShell>
  );
}
