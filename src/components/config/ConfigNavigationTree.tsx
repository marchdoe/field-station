import { Link } from "@tanstack/react-router";
import {
  Bot,
  ChevronRight,
  FolderOpen,
  Globe,
  Puzzle,
  Settings,
  Terminal,
  Webhook,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { cn, getProjectName } from "@/lib/utils";
import type { GlobalStats, ProjectInfo } from "@/types/config.js";

interface ConfigNavigationTreeProps {
  stats: GlobalStats;
  projects: ProjectInfo[];
}

interface TreeNodeProps {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  to: string;
  params?: Record<string, string>;
  theme: "accent" | "success";
  isLast?: boolean;
  depth?: number;
}

function TreeNode({
  icon,
  label,
  badge,
  to,
  params,
  theme,
  isLast = false,
  depth = 1,
}: TreeNodeProps) {
  const leftOffset = 19 + (depth - 1) * 20;

  return (
    <div className="relative">
      {/* Vertical connector line (continues to next sibling) */}
      {!isLast && (
        <div
          className="absolute top-0 bottom-0 border-l-2 border-border-muted"
          style={{ left: leftOffset }}
        />
      )}
      {/* Horizontal branch line */}
      <div
        className="absolute top-[18px] h-0 border-t-2 border-border-muted w-3"
        style={{ left: leftOffset }}
      />
      {/* Last item: partial vertical line (stops at branch) */}
      {isLast && (
        <div
          className="absolute top-0 border-l-2 border-border-muted h-[18px]"
          style={{ left: leftOffset }}
        />
      )}

      <Link
        to={to}
        params={params}
        className={cn(
          "group flex items-center gap-2.5 py-1.5 rounded-lg transition-colors relative",
          "hover:bg-surface-2",
        )}
        style={{ paddingLeft: leftOffset + 16 }}
      >
        <span
          className={cn(
            "flex-shrink-0",
            theme === "accent" && "text-accent",
            theme === "success" && "text-success",
          )}
        >
          {icon}
        </span>
        <span className="text-sm text-text-primary truncate">{label}</span>
        {badge && (
          <span
            className={cn(
              "ml-auto flex-shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium",
              theme === "accent" && "bg-accent/15 text-accent",
              theme === "success" && "bg-badge-success-bg text-badge-success-text",
            )}
          >
            {badge}
          </span>
        )}
        <ChevronRight
          className={cn(
            "w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0",
            !badge && "ml-auto",
          )}
        />
      </Link>
    </div>
  );
}

export function ConfigNavigationTree({ stats, projects }: ConfigNavigationTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["global"]));

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const settingsCount = (stats.settingsExists ? 1 : 0) + (stats.settingsLocalExists ? 1 : 0);

  const hasProjects = projects.length > 0;

  return (
    <div className="bg-surface-1 rounded-xl border border-border-default overflow-hidden">
      <div className="p-2">
        {/* Global root node */}
        <button
          type="button"
          aria-expanded={expanded.has("global")}
          onClick={() => toggle("global")}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors",
            "hover:bg-surface-2 text-left",
          )}
        >
          <ChevronRight
            className={cn(
              "w-4 h-4 text-text-muted transition-transform duration-200",
              expanded.has("global") && "rotate-90",
            )}
          />
          <Globe className="w-4.5 h-4.5 text-accent" />
          <span className="text-sm font-semibold text-text-primary">Global</span>
          <span className="ml-auto text-xs text-text-muted font-medium">~/.claude</span>
        </button>

        {expanded.has("global") && (
          <div className="mt-0.5 relative">
            {/* Global config sections */}
            <TreeNode
              icon={<Settings className="w-4 h-4" />}
              label="Settings"
              badge={
                settingsCount > 0
                  ? `${settingsCount} file${settingsCount !== 1 ? "s" : ""}`
                  : undefined
              }
              to="/global/settings"
              theme="accent"
            />
            <TreeNode
              icon={<Bot className="w-4 h-4" />}
              label="Agents"
              badge={stats.agentCount > 0 ? String(stats.agentCount) : undefined}
              to="/global/agents"
              theme="accent"
            />
            <TreeNode
              icon={<Terminal className="w-4 h-4" />}
              label="Commands"
              badge={stats.commandCount > 0 ? String(stats.commandCount) : undefined}
              to="/global/commands"
              theme="accent"
            />
            <TreeNode
              icon={<Zap className="w-4 h-4" />}
              label="Skills"
              badge={stats.skillCount > 0 ? String(stats.skillCount) : undefined}
              to="/global/skills"
              theme="accent"
            />
            <TreeNode
              icon={<Webhook className="w-4 h-4" />}
              label="Hooks"
              badge={
                stats.hookScriptCount > 0
                  ? `${stats.hookScriptCount} script${stats.hookScriptCount !== 1 ? "s" : ""}`
                  : undefined
              }
              to="/global/hooks"
              theme="accent"
            />
            <TreeNode
              icon={<Puzzle className="w-4 h-4" />}
              label="Plugins"
              badge={
                stats.pluginCount > 0
                  ? `${stats.enabledPluginCount}/${stats.pluginCount} enabled`
                  : undefined
              }
              to="/global/plugins"
              theme="accent"
              isLast={!hasProjects}
            />

            {/* Projects nested under Global to show inheritance */}
            {projects.map((project, idx) => {
              const projectKey = `project-${project.encodedPath}`;
              const isLastProject = idx === projects.length - 1;
              const isProjectExpanded = expanded.has(projectKey);
              const name = getProjectName(project.decodedPath);

              return (
                <div key={project.encodedPath} className="relative">
                  {/* Vertical connector to next project sibling */}
                  {!isLastProject && (
                    <div className="absolute top-0 bottom-0 left-[19px] border-l-2 border-border-muted" />
                  )}
                  {isLastProject && (
                    <div className="absolute top-0 left-[19px] border-l-2 border-border-muted h-[18px]" />
                  )}
                  {/* Horizontal branch */}
                  <div className="absolute top-[18px] left-[19px] border-t-2 border-border-muted w-3" />

                  <button
                    type="button"
                    aria-expanded={isProjectExpanded}
                    onClick={() => toggle(projectKey)}
                    className={cn(
                      "w-full flex items-center gap-2.5 pl-10 pr-3 py-1.5 rounded-lg transition-colors",
                      "hover:bg-surface-2 text-left",
                    )}
                  >
                    <ChevronRight
                      className={cn(
                        "w-3.5 h-3.5 text-text-muted transition-transform duration-200 flex-shrink-0",
                        isProjectExpanded && "rotate-90",
                      )}
                    />
                    <FolderOpen className="w-4 h-4 text-success flex-shrink-0" />
                    <span className="text-sm text-text-primary font-medium truncate">{name}</span>
                    <span className="ml-auto text-xs text-text-muted truncate max-w-[200px] hidden sm:inline">
                      {project.decodedPath}
                    </span>
                  </button>

                  {isProjectExpanded && (
                    <div className="relative">
                      <TreeNode
                        icon={<Settings className="w-3.5 h-3.5" />}
                        label="Settings"
                        to="/projects/$projectId/settings"
                        params={{ projectId: project.encodedPath }}
                        theme="success"
                        depth={2}
                      />
                      <TreeNode
                        icon={<Bot className="w-3.5 h-3.5" />}
                        label="Agents"
                        badge={project.agentCount > 0 ? String(project.agentCount) : undefined}
                        to="/projects/$projectId/agents"
                        params={{ projectId: project.encodedPath }}
                        theme="success"
                        depth={2}
                      />
                      <TreeNode
                        icon={<Terminal className="w-3.5 h-3.5" />}
                        label="Commands"
                        badge={project.commandCount > 0 ? String(project.commandCount) : undefined}
                        to="/projects/$projectId/commands"
                        params={{ projectId: project.encodedPath }}
                        theme="success"
                        depth={2}
                      />
                      <TreeNode
                        icon={<Zap className="w-3.5 h-3.5" />}
                        label="Skills"
                        badge={project.skillCount > 0 ? String(project.skillCount) : undefined}
                        to="/projects/$projectId/skills"
                        params={{ projectId: project.encodedPath }}
                        theme="success"
                        depth={2}
                        isLast
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
