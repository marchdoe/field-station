import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { Feature } from "@/server/functions/features.js";
import type { FeatureCategory } from "@/server/lib/feature-registry.js";
import { FeatureCard } from "./FeatureCard.js";

const ALL_CATEGORIES: Array<{ key: FeatureCategory | "undocumented" | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "experimental", label: "Experimental" },
  { key: "model", label: "Model" },
  { key: "ui", label: "UI" },
  { key: "security", label: "Security" },
  { key: "telemetry", label: "Telemetry" },
  { key: "advanced", label: "Advanced" },
  { key: "undocumented", label: "Undocumented" },
];

const CATEGORY_ORDER: Record<string, number> = {
  experimental: 0,
  model: 1,
  ui: 2,
  security: 3,
  telemetry: 4,
  advanced: 5,
  undocumented: 6,
};

interface FeatureListProps {
  features: Feature[];
  onToggle: (key: string, enabled: boolean) => void;
  onValueChange: (key: string, value: string) => void;
}

export function FeatureList({ features, onToggle, onValueChange }: FeatureListProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered = useMemo(() => {
    let result = features;
    if (activeCategory !== "all") {
      result = result.filter((f) => f.definition.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (f) =>
          f.definition.name.toLowerCase().includes(q) ||
          f.definition.key.toLowerCase().includes(q) ||
          f.definition.description.toLowerCase().includes(q),
      );
    }
    return result;
  }, [features, search, activeCategory]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Feature[]>();
    for (const f of filtered) {
      const cat = f.definition.category;
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)?.push(f);
    }
    return [...groups.entries()].sort(
      ([a], [b]) => (CATEGORY_ORDER[a] ?? 99) - (CATEGORY_ORDER[b] ?? 99),
    );
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <input
        type="text"
        placeholder="Search features..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-border-default bg-surface-1 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted"
      />

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setActiveCategory(cat.key)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors",
              activeCategory === cat.key
                ? "bg-accent text-white"
                : "bg-surface-2 text-text-secondary hover:bg-surface-3",
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grouped features */}
      {grouped.map(([category, items]) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-2 mt-4">
            {category} ({items.length})
          </h3>
          <div className="space-y-2">
            {items.map((feature) => (
              <FeatureCard
                key={feature.definition.key}
                feature={feature}
                onToggle={onToggle}
                onValueChange={onValueChange}
              />
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="text-center text-text-muted py-8">No features match your search.</div>
      )}
    </div>
  );
}
