import { Link } from "@tanstack/react-router";
import { Bot, Settings, Terminal, Zap } from "lucide-react";
import type { ProjectSummary } from "@/types/config.js";

const inactive = "text-text-muted hover:text-text-primary border-b-2 border-transparent";
const active = "border-b-2 border-accent text-accent";

export function ProjectTabs({
  projectId,
  summary,
}: {
  projectId: string;
  summary: ProjectSummary;
}) {
  const tabs = [
    {
      label: "Settings",
      to: "/projects/$projectId/settings" as const,
      icon: Settings,
      exact: false,
      count: (summary.settings ? 1 : 0) + (summary.settingsLocal ? 1 : 0),
    },
    {
      label: "Agents",
      to: "/projects/$projectId/agents" as const,
      icon: Bot,
      exact: false,
      count: summary.agentCount,
    },
    {
      label: "Commands",
      to: "/projects/$projectId/commands" as const,
      icon: Terminal,
      exact: false,
      count: summary.commandCount,
    },
    {
      label: "Skills",
      to: "/projects/$projectId/skills" as const,
      icon: Zap,
      exact: false,
      count: summary.skillCount,
    },
  ];

  return (
    <nav className="flex gap-1 border-b border-border-default">
      {tabs.map((tab) => (
        <Link
          key={tab.label}
          to={tab.to}
          params={{ projectId }}
          activeOptions={{ exact: tab.exact }}
          activeProps={{ className: active }}
          inactiveProps={{ className: inactive }}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors"
        >
          <tab.icon className="w-4 h-4" />
          {tab.label}
          {tab.count > 0 && (
            <span className="ml-1 text-xs bg-surface-2 text-text-muted px-1.5 py-0.5 rounded-full">
              {tab.count}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
