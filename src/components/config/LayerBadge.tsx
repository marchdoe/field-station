import { cn } from "@/lib/utils";

type ConfigSource = "global" | "global-local" | "project" | "project-local";

interface LayerBadgeProps {
  source: ConfigSource;
}

const sourceLabels: Record<ConfigSource, string> = {
  global: "Global",
  "global-local": "Global Local",
  project: "Project",
  "project-local": "Project Local",
};

export function LayerBadge({ source }: LayerBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        source === "global" && "bg-accent/15 text-accent",
        source === "global-local" && "border border-accent/40 text-accent bg-transparent",
        source === "project" && "bg-badge-success-bg text-badge-success-text",
        source === "project-local" &&
          "border border-badge-success-bg text-badge-success-text bg-transparent",
      )}
    >
      {sourceLabels[source]}
    </span>
  );
}
