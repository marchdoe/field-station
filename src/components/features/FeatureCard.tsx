import { cn } from "@/lib/utils";
import type { Feature } from "@/server/functions/features.js";

interface FeatureCardProps {
  feature: Feature;
  onToggle: (key: string, enabled: boolean) => void;
  onValueChange: (key: string, value: string) => void;
}

const categoryColors: Record<string, string> = {
  experimental: "bg-badge-warning-bg text-badge-warning-text",
  model: "bg-badge-info-bg text-badge-info-text",
  ui: "bg-accent/15 text-accent",
  security: "bg-danger/15 text-danger",
  telemetry: "bg-badge-success-bg text-badge-success-text",
  advanced: "bg-surface-2 text-text-secondary",
  undocumented: "bg-surface-2 text-text-muted",
};

function isEnabled(feature: Feature): boolean {
  const val = feature.currentValue;
  if (val === null) return false;
  if (typeof val === "boolean") return val;
  return val === "1" || val === "true";
}

export function FeatureCard({ feature, onToggle, onValueChange }: FeatureCardProps) {
  const { definition: def, isDocumented } = feature;
  const enabled = isEnabled(feature);
  const hasOptions = def.options && def.options.length > 0;

  return (
    <div
      className={cn(
        "flex items-start gap-4 rounded-xl border p-4 transition-colors",
        isDocumented
          ? "bg-surface-1 border-border-default"
          : "bg-surface-0 border-border-muted opacity-70",
      )}
    >
      {/* Toggle or control */}
      <div className="pt-0.5 shrink-0">
        {hasOptions ? (
          <select
            value={(feature.currentValue as string) ?? ""}
            onChange={(e) => onValueChange(def.key, e.target.value)}
            className="rounded-lg border border-border-default bg-surface-2 px-2 py-1 text-sm text-text-primary"
          >
            <option value="">Default{def.defaultValue ? ` (${def.defaultValue})` : ""}</option>
            {def.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : def.valueType === "number" ? (
          <input
            type="number"
            value={(feature.currentValue as string) ?? ""}
            placeholder={def.defaultValue ?? ""}
            onChange={(e) => onValueChange(def.key, e.target.value)}
            className="w-24 rounded-lg border border-border-default bg-surface-2 px-2 py-1 text-sm text-text-primary"
          />
        ) : (
          <button
            type="button"
            onClick={() => onToggle(def.key, !enabled)}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors",
              enabled ? "bg-accent" : "bg-surface-3",
            )}
          >
            <span
              className={cn(
                "inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5",
                enabled ? "translate-x-5 ml-0.5" : "translate-x-0.5",
              )}
            />
          </button>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-text-primary text-sm">
            {isDocumented ? def.name : def.key}
          </span>
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              categoryColors[def.category] ?? categoryColors.undocumented,
            )}
          >
            {def.category}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-surface-2 text-text-muted font-mono">
            {def.type}
          </span>
        </div>
        {isDocumented && (
          <code className="text-xs text-text-muted font-mono mt-0.5 block">{def.key}</code>
        )}
        {def.description && <p className="text-sm text-text-secondary mt-1">{def.description}</p>}
      </div>
    </div>
  );
}
