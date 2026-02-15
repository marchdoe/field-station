import { createFileRoute, useRouter } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { FeatureList } from "@/components/features/FeatureList.js";
import { AppShell } from "@/components/layout/AppShell.js";
import { useToast } from "@/components/ui/Toast.js";
import { deleteSetting, updateSetting } from "@/server/functions/config-mutations.js";
import { getFeatures } from "@/server/functions/features.js";

export const Route = createFileRoute("/global/features")({
  loader: async () => {
    return await getFeatures();
  },
  component: FeaturesPage,
  pendingComponent: () => (
    <AppShell title="Features & Experiments">
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-text-muted">Scanning features...</div>
      </div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell title="Features & Experiments">
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
        <p className="text-danger font-medium">Failed to load features</p>
        <p className="text-text-muted text-sm mt-1">{(error as Error).message}</p>
      </div>
    </AppShell>
  ),
});

function FeaturesPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const { toast } = useToast();
  const [hasChanges, setHasChanges] = useState(false);

  const handleToggle = async (key: string, enabled: boolean) => {
    const feature = data.features.find((f) => f.definition.key === key);
    if (!feature) return;

    try {
      const keyPath = feature.definition.type === "env" ? `env.${key}` : key;

      if (enabled) {
        const value = feature.definition.type === "env" ? "1" : true;
        await updateSetting({ data: { layer: "global", keyPath, value } });
        toast(`Enabled ${feature.definition.name}`);
      } else {
        await deleteSetting({ data: { layer: "global", keyPath } });
        toast(`Disabled ${feature.definition.name}`);
      }
      setHasChanges(true);
      router.invalidate();
    } catch (e) {
      toast(`Failed to update ${feature.definition.name}: ${(e as Error).message}`, "error");
    }
  };

  const handleValueChange = async (key: string, value: string) => {
    const feature = data.features.find((f) => f.definition.key === key);
    if (!feature) return;

    try {
      const keyPath = feature.definition.type === "env" ? `env.${key}` : key;

      if (value === "") {
        await deleteSetting({ data: { layer: "global", keyPath } });
        toast(`Reset ${feature.definition.name} to default`);
      } else {
        const coerced = feature.definition.valueType === "number" ? Number(value) : value;
        await updateSetting({ data: { layer: "global", keyPath, value: coerced } });
        toast(`Updated ${feature.definition.name}`);
      }
      setHasChanges(true);
      router.invalidate();
    } catch (e) {
      toast(`Failed to update ${feature.definition.name}: ${(e as Error).message}`, "error");
    }
  };

  return (
    <AppShell title="Features & Experiments">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Features & Experiments</h1>
          <p className="text-text-secondary mt-1">
            {data.version ? (
              <>
                Claude Code v{data.version} — {data.totalDiscovered} detected,{" "}
                {data.totalDocumented} documented
              </>
            ) : (
              "Claude Code not found"
            )}
          </p>
        </div>

        {hasChanges && (
          <div className="flex items-center gap-2 rounded-lg border border-badge-warning-text/20 bg-badge-warning-bg px-4 py-3 text-sm text-badge-warning-text">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Settings updated. Restart Claude Code for changes to take effect.
          </div>
        )}

        <FeatureList
          features={data.features}
          onToggle={handleToggle}
          onValueChange={handleValueChange}
        />
      </div>
    </AppShell>
  );
}
