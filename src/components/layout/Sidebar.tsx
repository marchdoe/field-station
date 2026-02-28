import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Bot,
  FolderOpen,
  Globe,
  History,
  LayoutDashboard,
  LogOut,
  Puzzle,
  Radio,
  Settings,
  Sparkles,
  Terminal,
  ToggleLeft,
  Webhook,
  X,
} from "lucide-react";
import { NavLink } from "react-router";
import { getProjects } from "@/lib/api.js";
import { cn, encodePath, getProjectName } from "@/lib/utils";

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

const globalChildren: NavItem[] = [
  { label: "Features", to: "/global/features", icon: <ToggleLeft size={16} /> },
  { label: "Settings", to: "/global/settings", icon: <Settings size={16} /> },
  { label: "Instructions", to: "/global/instructions", icon: <BookOpen size={16} /> },
  { label: "Plugins", to: "/global/plugins", icon: <Puzzle size={16} /> },
  { label: "Agents", to: "/global/agents", icon: <Bot size={16} /> },
  { label: "Skills", to: "/global/skills", icon: <Sparkles size={16} /> },
  { label: "Commands", to: "/global/commands", icon: <Terminal size={16} /> },
  { label: "Hooks", to: "/global/hooks", icon: <Webhook size={16} /> },
];

const linkBaseClass = cn(
  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
  "text-text-secondary hover:text-text-primary hover:bg-surface-2",
);

const linkActiveClass = cn(
  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
  "bg-accent-muted text-accent font-medium",
);

function SidebarNavLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) => (isActive ? linkActiveClass : linkBaseClass)}
      end
    >
      {item.icon}
      <span>{item.label}</span>
    </NavLink>
  );
}

function TreeChild({ item, isLast }: { item: NavItem; isLast: boolean }) {
  return (
    <div className="relative">
      {/* Vertical connector line */}
      {!isLast && (
        <div className="absolute top-0 bottom-0 left-[19px] border-l-2 border-border-muted" />
      )}
      {/* Partial vertical line for last item */}
      {isLast && (
        <div className="absolute top-0 left-[19px] border-l-2 border-border-muted h-[17px]" />
      )}
      {/* Horizontal branch */}
      <div className="absolute top-[17px] left-[19px] border-t-2 border-border-muted w-2.5" />

      <NavLink
        to={item.to}
        className={({ isActive }) =>
          isActive
            ? cn(
                "flex items-center gap-2.5 rounded-lg py-1.5 pl-10 pr-3 text-sm transition-colors",
                "bg-accent-muted text-accent font-medium",
              )
            : cn(
                "flex items-center gap-2.5 rounded-lg py-1.5 pl-10 pr-3 text-sm transition-colors",
                "text-text-secondary hover:text-text-primary hover:bg-surface-2",
              )
        }
        end
      >
        <span className="text-accent">{item.icon}</span>
        <span>{item.label}</span>
      </NavLink>
    </div>
  );
}

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const projects = useQuery({ queryKey: ["projects"], queryFn: getProjects });

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  }

  return (
    <aside className={cn("flex h-full w-60 flex-col border-r border-border-default bg-surface-1")}>
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border-default px-5">
        <Radio size={20} className="text-accent" />
        <span className="text-base font-semibold text-text-primary">Field Station</span>
        <button
          type="button"
          aria-label="Close sidebar"
          className="ml-auto md:hidden"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3" aria-label="Main navigation">
        {/* Dashboard */}
        <div className="space-y-1">
          <SidebarNavLink
            item={{ label: "Dashboard", to: "/", icon: <LayoutDashboard size={18} /> }}
          />
        </div>

        {/* Global with tree children */}
        <div className="mt-4">
          <NavLink
            to="/global"
            className={({ isActive }) => (isActive ? linkActiveClass : linkBaseClass)}
            end
          >
            <Globe size={18} />
            <span>Global</span>
          </NavLink>
          <div className="mt-0.5">
            {globalChildren.map((item, i) => (
              <TreeChild key={item.to} item={item} isLast={i === globalChildren.length - 1} />
            ))}
          </div>
        </div>

        {/* Projects */}
        <div className="mt-4">
          <div className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
            Projects
          </div>
          <div className="space-y-0.5">
            {(projects.data ?? []).map((project) => (
              <NavLink
                key={project.path}
                to={`/projects/${encodePath(project.path)}`}
                className={({ isActive }) => (isActive ? linkActiveClass : linkBaseClass)}
              >
                <FolderOpen size={16} />
                <span className="truncate">{getProjectName(project.path)}</span>
              </NavLink>
            ))}
            {(projects.data ?? []).length === 0 && (
              <p className="px-3 py-2 text-xs text-text-muted">No projects registered</p>
            )}
          </div>
        </div>

        {/* History — de-emphasized, separated from main nav */}
        <div className="mt-4 pt-4 border-t border-border-muted">
          <SidebarNavLink
            item={{ label: "History", to: "/history", icon: <History size={16} /> }}
          />
        </div>
      </nav>

      {/* Logout — pinned to bottom, separated */}
      <div className="border-t border-border-default p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors text-text-secondary hover:text-text-primary hover:bg-surface-2"
        >
          <LogOut size={16} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
