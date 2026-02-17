import { getRouteApi, Link } from "@tanstack/react-router";
import {
  Bot,
  FolderOpen,
  Globe,
  LayoutDashboard,
  Puzzle,
  Radio,
  Settings,
  Sparkles,
  Terminal,
  ToggleLeft,
  Webhook,
  X,
} from "lucide-react";
import { cn, getProjectName } from "@/lib/utils";

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

const globalChildren: NavItem[] = [
  { label: "Settings", to: "/global/settings", icon: <Settings size={16} /> },
  { label: "Agents", to: "/global/agents", icon: <Bot size={16} /> },
  { label: "Commands", to: "/global/commands", icon: <Terminal size={16} /> },
  { label: "Skills", to: "/global/skills", icon: <Sparkles size={16} /> },
  { label: "Hooks", to: "/global/hooks", icon: <Webhook size={16} /> },
  { label: "Plugins", to: "/global/plugins", icon: <Puzzle size={16} /> },
  { label: "Features", to: "/global/features", icon: <ToggleLeft size={16} /> },
];

const linkBaseClass = cn(
  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
  "text-text-secondary hover:text-text-primary hover:bg-surface-2",
);

const linkActiveClass = cn(
  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
  "bg-accent-muted text-accent font-medium",
);

function NavLink({ item }: { item: NavItem }) {
  return (
    <Link
      to={item.to}
      className={linkBaseClass}
      activeProps={{ className: linkActiveClass }}
      activeOptions={{ exact: true }}
    >
      {item.icon}
      <span>{item.label}</span>
    </Link>
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

      <Link
        to={item.to}
        className={cn(
          "flex items-center gap-2.5 rounded-lg py-1.5 pl-10 pr-3 text-sm transition-colors",
          "text-text-secondary hover:text-text-primary hover:bg-surface-2",
        )}
        activeProps={{
          className: cn(
            "flex items-center gap-2.5 rounded-lg py-1.5 pl-10 pr-3 text-sm transition-colors",
            "bg-accent-muted text-accent font-medium",
          ),
        }}
        activeOptions={{ exact: true }}
      >
        <span className="text-accent">{item.icon}</span>
        <span>{item.label}</span>
      </Link>
    </div>
  );
}

const rootRouteApi = getRouteApi("__root__");

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const { projects } = rootRouteApi.useLoaderData();

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
          <NavLink item={{ label: "Dashboard", to: "/", icon: <LayoutDashboard size={18} /> }} />
        </div>

        {/* Global with tree children */}
        <div className="mt-4">
          <Link
            to="/global"
            className={linkBaseClass}
            activeProps={{ className: linkActiveClass }}
            activeOptions={{ exact: true }}
          >
            <Globe size={18} />
            <span>Global</span>
          </Link>
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
            {projects.map((project) => (
              <Link
                key={project.encodedPath}
                to="/projects/$projectId"
                params={{ projectId: project.encodedPath }}
                className={linkBaseClass}
                activeProps={{ className: linkActiveClass }}
              >
                <FolderOpen size={16} />
                <span className="truncate">{getProjectName(project.decodedPath)}</span>
              </Link>
            ))}
            {projects.length === 0 && (
              <p className="px-3 py-2 text-xs text-text-muted">No projects registered</p>
            )}
          </div>
        </div>
      </nav>
    </aside>
  );
}
