import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { LayerBadge } from "@/components/config/LayerBadge.js";
import { SettingsViewer } from "@/components/config/SettingsViewer.js";
import { AppShell } from "@/components/layout/AppShell.js";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog.js";
import { useToast } from "@/components/ui/Toast.js";
import { getGlobalSettings, getGlobalSettingsLocal } from "@/server/functions/config.js";
import { deleteSetting, moveSetting, updateSetting } from "@/server/functions/config-mutations.js";
import type { ConfigLayerSource, JsonValue } from "@/types/config.js";

export const Route = createFileRoute("/global/settings")({
  loader: async () => {
    const [settings, settingsLocal] = await Promise.all([
      getGlobalSettings(),
      getGlobalSettingsLocal(),
    ]);
    return { settings, settingsLocal };
  },
  component: GlobalSettingsPage,
  pendingComponent: () => (
    <AppShell title="Global Settings">
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-text-muted">Loading settings...</div>
      </div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell title="Global Settings">
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
        <p className="text-danger font-medium">Failed to load settings</p>
        <p className="text-text-muted text-sm mt-1">{(error as Error).message}</p>
      </div>
    </AppShell>
  ),
});

function GlobalSettingsPage() {
  const { settings, settingsLocal } = Route.useLoaderData();
  const router = useRouter();
  const { toast } = useToast();

  // Confirmation dialog state
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);

  function createHandlers(layer: ConfigLayerSource) {
    return {
      onUpdate: async (keyPath: string, value: JsonValue) => {
        try {
          await updateSetting({ data: { layer, keyPath, value } });
          toast(`Updated "${keyPath}"`);
          router.invalidate();
        } catch (e) {
          toast(`Failed to update "${keyPath}": ${(e as Error).message}`, "error");
        }
      },
      onDelete: (keyPath: string) => {
        setConfirmState({
          open: true,
          title: "Delete Setting",
          message: `Are you sure you want to delete "${keyPath}" from the ${layer} layer?`,
          action: async () => {
            try {
              await deleteSetting({ data: { layer, keyPath } });
              toast(`Deleted "${keyPath}"`);
              router.invalidate();
            } catch (e) {
              toast(`Failed to delete "${keyPath}": ${(e as Error).message}`, "error");
            }
          },
        });
      },
      onMove: (keyPath: string, targetLayer: ConfigLayerSource) => {
        setConfirmState({
          open: true,
          title: "Move Setting",
          message: `Move "${keyPath}" from ${layer} to ${targetLayer}?`,
          action: async () => {
            try {
              await moveSetting({ data: { fromLayer: layer, toLayer: targetLayer, keyPath } });
              toast(`Moved "${keyPath}" to ${targetLayer}`);
              router.invalidate();
            } catch (e) {
              toast(`Failed to move "${keyPath}": ${(e as Error).message}`, "error");
            }
          },
        });
      },
      onAdd: async (keyPath: string, value: JsonValue) => {
        try {
          await updateSetting({ data: { layer, keyPath, value } });
          toast(`Added "${keyPath}"`);
          router.invalidate();
        } catch (e) {
          toast(`Failed to add "${keyPath}": ${(e as Error).message}`, "error");
        }
      },
    };
  }

  const globalHandlers = createHandlers("global");
  const globalLocalHandlers = createHandlers("global-local");

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
              {!settings.exists && (
                <span className="text-xs text-text-muted bg-surface-2 px-2 py-0.5 rounded-full">
                  Not found
                </span>
              )}
            </div>
            {settings.exists && settings.content ? (
              <SettingsViewer
                settings={settings.content}
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
              {!settingsLocal.exists && (
                <span className="text-xs text-text-muted bg-surface-2 px-2 py-0.5 rounded-full">
                  Not found
                </span>
              )}
            </div>
            {settingsLocal.exists && settingsLocal.content ? (
              <SettingsViewer
                settings={settingsLocal.content}
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
