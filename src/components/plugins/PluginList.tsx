import { PackageX } from "lucide-react";
import React from "react";

interface PluginListProps {
  children: React.ReactNode;
  emptyMessage?: string;
}

export default function PluginList({
  children,
  emptyMessage = "No plugins installed.",
}: PluginListProps) {
  const hasChildren = React.Children.count(children) > 0;

  if (!hasChildren) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-muted">
        <PackageX size={40} className="mb-3 opacity-50" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>;
}
