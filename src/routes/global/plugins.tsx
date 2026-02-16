import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell.js";
import { PluginCard } from "@/components/plugins/PluginCard.js";
import { getInstalledPlugins } from "@/server/functions/plugins.js";

export const Route = createFileRoute("/global/plugins")({
  head: () => ({
    meta: [{ title: "Plugins - Field Station" }],
  }),
  loader: async () => {
    const plugins = await getInstalledPlugins();
    return { plugins };
  },
  component: GlobalPluginsPage,
  pendingComponent: () => (
    <AppShell title="Global Plugins">
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-text-muted">Loading plugins...</div>
      </div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell title="Global Plugins">
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
        <p className="text-danger font-medium">Failed to load plugins</p>
        <p className="text-text-muted text-sm mt-1">{(error as Error).message}</p>
      </div>
    </AppShell>
  ),
});

function GlobalPluginsPage() {
  const { plugins } = Route.useLoaderData();
  const enabledCount = plugins.filter((p) => p.enabled).length;

  return (
    <AppShell title="Global Plugins">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Installed Plugins</h1>
          <p className="text-text-secondary mt-1">
            {plugins.length} plugin{plugins.length !== 1 ? "s" : ""} installed, {enabledCount}{" "}
            enabled
          </p>
        </div>

        {plugins.length === 0 ? (
          <div className="bg-surface-1 border border-border-default rounded-xl p-6 text-text-muted text-center">
            No plugins installed
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {plugins.map((plugin) => (
              <PluginCard key={plugin.id} {...plugin} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
