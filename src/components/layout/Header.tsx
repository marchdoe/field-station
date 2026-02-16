import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeToggle from "./ThemeToggle";

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
}

export default function Header({ title, onMenuClick }: HeaderProps) {
  return (
    <header
      className={cn(
        "flex h-14 items-center justify-between border-b border-border-default bg-surface-1 px-6",
      )}
    >
      <nav className="flex items-center gap-2 text-sm">
        <button type="button" className="mr-2 md:hidden" onClick={onMenuClick}>
          <Menu size={20} />
        </button>
        <span className="font-medium text-text-primary">Field Station</span>
        {title && (
          <>
            <span className="text-text-muted">/</span>
            <span className="text-text-secondary">{title}</span>
          </>
        )}
      </nav>

      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}
