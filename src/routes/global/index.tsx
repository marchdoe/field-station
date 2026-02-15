import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, ChevronRight, Puzzle, Settings, Terminal, Webhook, Zap } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell.js";
import { getGlobalStats } from "@/server/functions/projects.js";

export const Route = createFileRoute("/global/")({
  loader: async () => {
    const stats = await getGlobalStats();
    return { stats };
  },
  component: GlobalOverviewPage,
  pendingComponent: () => (
    <AppShell title="Global">
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-text-muted">Loading...</div>
      </div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell title="Global">
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
        <p className="text-danger font-medium">Failed to load global overview</p>
        <p className="text-text-muted text-sm mt-1">{(error as Error).message}</p>
      </div>
    </AppShell>
  ),
});

function GlobalOverviewPage() {
  const { stats } = Route.useLoaderData();

  const sections = [
    {
      label: "Settings",
      description: "Global settings.json and settings.local.json",
      icon: <Settings className="w-5 h-5" />,
      href: "/global/settings",
      count: (stats.settingsExists ? 1 : 0) + (stats.settingsLocalExists ? 1 : 0),
      countLabel: "files",
    },
    {
      label: "Agents",
      description: "Custom agent definitions (.md files)",
      icon: <Bot className="w-5 h-5" />,
      href: "/global/agents",
      count: stats.agentCount,
      countLabel: "agents",
    },
    {
      label: "Commands",
      description: "Slash command definitions organized by folder",
      icon: <Terminal className="w-5 h-5" />,
      href: "/global/commands",
      count: stats.commandCount,
      countLabel: `commands in ${stats.commandFolderCount} folders`,
    },
    {
      label: "Skills",
      description: "Skill packages with SKILL.md definitions",
      icon: <Zap className="w-5 h-5" />,
      href: "/global/skills",
      count: stats.skillCount,
      countLabel: "skills",
    },
    {
      label: "Hooks",
      description: "Event-driven hook scripts and configuration",
      icon: <Webhook className="w-5 h-5" />,
      href: "/global/hooks",
      count: stats.hookScriptCount,
      countLabel: "scripts",
    },
    {
      label: "Plugins",
      description: "Installed plugins and their status",
      icon: <Puzzle className="w-5 h-5" />,
      href: "/global/plugins",
      count: stats.pluginCount,
      countLabel: `plugins (${stats.enabledPluginCount} enabled)`,
    },
  ];

  return (
    <AppShell title="Global">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Global Configuration</h1>
          <p className="text-text-secondary mt-1">
            Settings and resources from{" "}
            <code className="text-sm bg-surface-2 px-1.5 py-0.5 rounded">~/.claude/</code>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((section) => (
            <Link
              key={section.href}
              to={section.href}
              className="bg-surface-1 border border-border-default rounded-xl p-5 hover:border-accent/40 transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-text-muted group-hover:text-accent transition-colors">
                    {section.icon}
                  </div>
                  <h3 className="font-semibold text-text-primary">{section.label}</h3>
                </div>
                <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors" />
              </div>
              <p className="text-sm text-text-secondary mb-3">{section.description}</p>
              <p className="text-sm text-text-muted">
                <span className="font-semibold text-text-primary">{section.count}</span>{" "}
                {section.countLabel}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
