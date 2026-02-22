import { BookOpen, Bot, Brain, Settings, Terminal, Zap } from "lucide-react";
import { NavLink } from "react-router";

const inactive = "text-text-muted hover:text-text-primary border-b-2 border-transparent";
const active = "border-b-2 border-accent text-accent";

interface ProjectTabsProps {
  projectId: string;
  counts?: {
    settings: number;
    agents: number;
    commands: number;
    skills: number;
  };
}

export function ProjectTabs({ projectId, counts }: ProjectTabsProps) {
  const tabs = [
    {
      label: "Settings",
      to: `/projects/${projectId}/settings`,
      icon: Settings,
      count: counts?.settings,
    },
    {
      label: "Agents",
      to: `/projects/${projectId}/agents`,
      icon: Bot,
      count: counts?.agents,
    },
    {
      label: "Commands",
      to: `/projects/${projectId}/commands`,
      icon: Terminal,
      count: counts?.commands,
    },
    {
      label: "Skills",
      to: `/projects/${projectId}/skills`,
      icon: Zap,
      count: counts?.skills,
    },
    {
      label: "Instructions",
      to: `/projects/${projectId}/instructions`,
      icon: BookOpen,
    },
    {
      label: "Memory",
      to: `/projects/${projectId}/memory`,
      icon: Brain,
    },
  ];

  return (
    <nav className="flex gap-1 border-b border-border-default">
      {tabs.map((tab) => (
        <NavLink
          key={tab.label}
          to={tab.to}
          end={false}
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${isActive ? active : inactive}`
          }
        >
          <tab.icon className="w-4 h-4" />
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && (
            <span className="ml-1 text-xs bg-surface-2 text-text-muted px-1.5 py-0.5 rounded-full">
              {tab.count}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
