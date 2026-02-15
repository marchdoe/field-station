import { cn } from "@/lib/utils";

interface ViewToggleProps {
  view: "structured" | "raw";
  onChange: (view: "structured" | "raw") => void;
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-lg bg-surface-2 p-0.5">
      <button
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
