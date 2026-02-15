export const APP_NAME = "Field Station";
export const APP_PORT = 3456;

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: "layout-dashboard" },
  {
    label: "Global",
    href: "/global",
    icon: "globe",
    children: [
      { label: "Overview", href: "/global" },
      { label: "Settings", href: "/global/settings" },
      { label: "Agents", href: "/global/agents" },
      { label: "Commands", href: "/global/commands" },
      { label: "Skills", href: "/global/skills" },
      { label: "Hooks", href: "/global/hooks" },
      { label: "Plugins", href: "/global/plugins" },
    ],
  },
  { label: "Projects", href: "/projects", icon: "folder-open" },
] as const;
