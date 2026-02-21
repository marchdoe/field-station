import { useQuery } from "@tanstack/react-query";
import { Package, User } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell.js";
import * as api from "@/lib/api.js";

export function GlobalPluginsPage() {
  const {
    data: plugins = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["plugins"],
    queryFn: api.getPlugins,
  });

  if (isLoading) {
    return (
      <AppShell title="Global Plugins">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-text-muted">Loading plugins...</div>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Global Plugins">
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
          <p className="text-danger font-medium">Failed to load plugins</p>
          <p className="text-text-muted text-sm mt-1">{error instanceof Error ? error.message : String(error)}</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Global Plugins">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Installed Plugins</h1>
          <p className="text-text-secondary mt-1">
            {plugins.length} plugin{plugins.length !== 1 ? "s" : ""} installed
          </p>
        </div>

        {plugins.length === 0 ? (
          <div className="bg-surface-1 border border-border-default rounded-xl p-6 text-text-muted text-center">
            No plugins installed
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {plugins.map((plugin) => (
              <div
                key={plugin.path}
                className="bg-surface-1 border border-border-default rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Package className="w-4 h-4 text-accent shrink-0" />
                    <span className="font-semibold text-text-primary truncate">{plugin.name}</span>
                  </div>
                  {plugin.isUserOwned ? (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-badge-success-bg text-badge-success-text shrink-0">
                      <User className="w-3 h-3" />
                      User-owned
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-surface-2 text-text-muted shrink-0">
                      Plugin
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted font-mono break-all">{plugin.path}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
