import {
  BookOpen,
  Bot,
  ChevronRight,
  Puzzle,
  Settings,
  Terminal,
  Webhook,
  Zap,
} from "lucide-react";
import { Link } from "react-router";
import { AppShell } from "@/components/layout/AppShell.js";

export function GlobalOverviewPage() {
  const sections = [
    {
      label: "Settings",
      description: "Global settings.json and settings.local.json",
      icon: <Settings className="w-5 h-5" />,
      href: "/global/settings",
    },
    {
      label: "Agents",
      description: "Custom agent definitions (.md files)",
      icon: <Bot className="w-5 h-5" />,
      href: "/global/agents",
    },
    {
      label: "Commands",
      description: "Slash command definitions organized by folder",
      icon: <Terminal className="w-5 h-5" />,
      href: "/global/commands",
    },
    {
      label: "Skills",
      description: "Skill packages with SKILL.md definitions",
      icon: <Zap className="w-5 h-5" />,
      href: "/global/skills",
    },
    {
      label: "Hooks",
      description: "Event-driven hook scripts and configuration",
      icon: <Webhook className="w-5 h-5" />,
      href: "/global/hooks",
    },
    {
      label: "Plugins",
      description: "Installed plugins and their status",
      icon: <Puzzle className="w-5 h-5" />,
      href: "/global/plugins",
    },
    {
      label: "Instructions",
      description: "CLAUDE.md and CLAUDE.local.md instruction files",
      icon: <BookOpen className="w-5 h-5" />,
      href: "/global/instructions",
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
              <p className="text-sm text-text-secondary">{section.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
