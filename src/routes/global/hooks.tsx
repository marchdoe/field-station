import { createFileRoute } from "@tanstack/react-router";
import { FileCode, Webhook } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell.js";
import { cn } from "@/lib/utils";
import { getHookConfig, listHookScripts } from "@/server/functions/hooks.js";

export const Route = createFileRoute("/global/hooks")({
  head: () => ({
    meta: [{ title: "Hooks - Field Station" }],
  }),
  loader: async () => {
    const [scripts, config] = await Promise.all([listHookScripts(), getHookConfig()]);
    return { scripts, config };
  },
  component: GlobalHooksPage,
  pendingComponent: () => (
    <AppShell title="Global Hooks">
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-text-muted">Loading hooks...</div>
      </div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell title="Global Hooks">
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
        <p className="text-danger font-medium">Failed to load hooks</p>
        <p className="text-text-muted text-sm mt-1">{(error as Error).message}</p>
      </div>
    </AppShell>
  ),
});

function GlobalHooksPage() {
  const { scripts, config } = Route.useLoaderData();

  return (
    <AppShell title="Global Hooks">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Global Hooks</h1>
          <p className="text-text-secondary mt-1">
            Event-driven hooks from settings and{" "}
            <code className="text-sm bg-surface-2 px-1.5 py-0.5 rounded">~/.claude/hooks/</code>
          </p>
        </div>

        {config && Object.keys(config).length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">Hook Configuration</h2>
            <p className="text-sm text-text-secondary mb-4">Hooks defined in settings.json</p>
            <div className="space-y-3">
              {Object.entries(config).map(([event, hooks]) => (
                <div
                  key={event}
                  className="bg-surface-1 border border-border-default rounded-xl p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Webhook className="w-4 h-4 text-accent" />
                    <h3 className="font-semibold text-text-primary">{event}</h3>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        (event === "SessionStart" || event === "Stop") &&
                          "bg-badge-success-bg text-badge-success-text",
                        (event === "PreToolUse" || event === "PostToolUse") &&
                          "bg-badge-info-bg text-badge-info-text",
                        event === "Notification" && "bg-badge-warning-bg text-badge-warning-text",
                        (event === "SubagentStop" || event === "UserPromptSubmit") &&
                          "bg-accent/15 text-accent",
                      )}
                    >
                      {Array.isArray(hooks) ? hooks.length : 0} handler
                      {Array.isArray(hooks) && hooks.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {Array.isArray(hooks) &&
                    hooks.map((hookGroup, i) => (
                      <div key={i} className="mt-2">
                        {hookGroup.hooks?.map(
                          (hook: { type: string; command: string }, j: number) => (
                            <pre
                              key={j}
                              className="text-sm bg-surface-2 rounded-lg p-3 overflow-x-auto text-text-secondary"
                            >
                              <code>{hook.command}</code>
                            </pre>
                          ),
                        )}
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Hook Scripts</h2>
          <p className="text-sm text-text-secondary mb-4">
            {scripts.length} script file{scripts.length !== 1 ? "s" : ""}
          </p>

          {scripts.length === 0 ? (
            <div className="bg-surface-1 border border-border-default rounded-xl p-6 text-text-muted text-center">
              No hook scripts found
            </div>
          ) : (
            <div className="space-y-4">
              {scripts.map((script) => (
                <div
                  key={script.fileName}
                  className="bg-surface-1 border border-border-default rounded-xl overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border-muted">
                    <FileCode className="w-4 h-4 text-accent" />
                    <span className="font-medium text-text-primary text-sm">{script.fileName}</span>
                  </div>
                  <pre className="text-sm p-4 overflow-x-auto text-text-secondary">
                    <code>{script.contentPreview}</code>
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
