import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { FeatureList } from "@/components/features/FeatureList.js";
import { AppShell } from "@/components/layout/AppShell.js";
import { useToast } from "@/components/ui/Toast.js";
import type { Feature } from "@/lib/api.js";
import * as api from "@/lib/api.js";

export function GlobalFeaturesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [hasChanges, setHasChanges] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["features"],
    queryFn: api.getFeatures,
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, value, type }: { key: string; value: unknown; type: "env" | "setting" }) =>
      api.updateFeature(key, { value, type }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["features"] });
      setHasChanges(true);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (key: string) => api.deleteFeature(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["features"] });
      setHasChanges(true);
    },
  });

  const handleToggle = async (key: string, enabled: boolean) => {
    const feature = data?.features.find((f) => f.definition.key === key);
    if (!feature) return;

    try {
      if (enabled) {
        const value = feature.definition.type === "env" ? "1" : true;
        await updateMutation.mutateAsync({ key, value, type: feature.definition.type });
        toast(`Enabled ${feature.definition.name}`);
      } else {
        await deleteMutation.mutateAsync(key);
        toast(`Disabled ${feature.definition.name}`);
      }
    } catch (e) {
      toast(`Failed to update ${feature.definition.name}: ${(e as Error).message}`, "error");
    }
  };

  const handleValueChange = async (key: string, value: string) => {
    const feature = data?.features.find((f) => f.definition.key === key);
    if (!feature) return;

    try {
      if (value === "") {
        await deleteMutation.mutateAsync(key);
        toast(`Reset ${feature.definition.name} to default`);
      } else {
        const currentVal = feature.currentValue;
        const coerced = typeof currentVal === "number" ? Number(value) : value;
        await updateMutation.mutateAsync({ key, value: coerced, type: feature.definition.type });
        toast(`Updated ${feature.definition.name}`);
      }
    } catch (e) {
      toast(`Failed to update ${feature.definition.name}: ${(e as Error).message}`, "error");
    }
  };

  if (isLoading) {
    return (
      <AppShell title="Features & Experiments">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-text-muted">Scanning features...</div>
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell title="Features & Experiments">
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
          <p className="text-danger font-medium">Failed to load features</p>
          <p className="text-text-muted text-sm mt-1">
            {error ? (error as Error).message : "No data"}
          </p>
        </div>
      </AppShell>
    );
  }

  // Cast Go API features to the Feature type expected by FeatureList/FeatureCard.
  // The Go API FeatureDefinition includes `{ [key: string]: unknown }` which accommodates
  // the old valueType field. The cast is safe because FeatureCard falls back gracefully.
  const features = data.features as unknown as Feature[];

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
          features={features}
          onToggle={handleToggle}
          onValueChange={handleValueChange}
        />
      </div>
    </AppShell>
  );
}
