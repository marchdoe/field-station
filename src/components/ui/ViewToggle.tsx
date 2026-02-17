import { cn } from "@/lib/utils";

interface ViewToggleProps {
  view: "structured" | "raw";
  onChange: (view: "structured" | "raw") => void;
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: role="group" on div is correct for toggle button group
    <div role="group" aria-label="View mode" className="inline-flex rounded-lg bg-surface-2 p-0.5">
      <button
        type="button"
        aria-pressed={view === "structured"}
        onClick={() => onChange("structured")}
        className={cn(
          "rounded-md px-3 py-1 text-xs font-medium transition-colors",
          view === "structured"
            ? "bg-surface-0 text-text-primary shadow-sm"
            : "text-text-muted hover:text-text-secondary",
        )}
      >
        Structured
      </button>
      <button
        type="button"
        aria-pressed={view === "raw"}
        onClick={() => onChange("raw")}
        className={cn(
          "rounded-md px-3 py-1 text-xs font-medium transition-colors",
          view === "raw"
            ? "bg-surface-0 text-text-primary shadow-sm"
            : "text-text-muted hover:text-text-secondary",
        )}
      >
        Raw
      </button>
    </div>
  );
}
