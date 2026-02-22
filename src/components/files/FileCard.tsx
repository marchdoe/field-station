import { cn } from "@/lib/utils";

type FileCardVariant = "default" | "agent" | "command" | "skill" | "instructions" | "memory";

interface FileCardProps {
  name: string;
  description?: string;
  fileName: string;
  meta?: Record<string, string>;
  preview?: string;
  icon?: React.ReactNode;
  variant?: FileCardVariant;
}

const variantStyles: Record<FileCardVariant, { border: string; iconBg: string }> = {
  default: { border: "", iconBg: "bg-surface-2" },
  agent: {
    border: "border-l-4 border-l-accent",
    iconBg: "bg-accent/15",
  },
  command: {
    border: "border-l-4 border-l-blue-500",
    iconBg: "bg-blue-500/15",
  },
  skill: {
    border: "border-l-4 border-l-amber-500",
    iconBg: "bg-amber-500/15",
  },
  instructions: {
    border: "border-l-4 border-l-green-600",
    iconBg: "bg-green-600/15",
  },
  memory: {
    border: "border-l-4 border-l-purple-500",
    iconBg: "bg-purple-500/15",
  },
};

export function FileCard({
  name,
  description,
  fileName,
  meta,
  preview,
  icon,
  variant = "default",
}: FileCardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "rounded-xl border border-border-default bg-surface-1 p-4 transition-colors hover:border-border-muted hover:bg-surface-1/80",
        styles.border,
      )}
    >
      <div className="mb-1 flex items-start gap-2">
        {icon && (
          <div
            className={cn(
              "mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center",
              styles.iconBg,
            )}
          >
            {icon}
          </div>
        )}
        <h3 className="text-sm font-semibold text-text-primary">{name}</h3>
      </div>

      <p className="mb-2 text-xs text-text-muted">{fileName}</p>

      {description && (
        <p className="mb-3 text-sm leading-relaxed text-text-secondary">{description}</p>
      )}

      {meta && Object.keys(meta).length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {Object.entries(meta).map(([key, value]) => (
            <span
              key={key}
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs",
                "bg-surface-2 text-text-secondary border border-border-muted",
              )}
            >
              {key}: {value}
            </span>
          ))}
        </div>
      )}

      {preview && (
        <div className="relative overflow-hidden rounded-lg bg-surface-2">
          <pre className="overflow-x-auto p-3 text-xs text-text-secondary">
            <code className="line-clamp-4 whitespace-pre-wrap">{preview}</code>
          </pre>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-surface-2 to-transparent" />
        </div>
      )}
    </div>
  );
}
