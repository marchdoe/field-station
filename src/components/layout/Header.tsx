import { Menu, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeToggle from "./ThemeToggle";

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
  onSearchClick?: () => void;
}

export default function Header({ title, onMenuClick, onSearchClick }: HeaderProps) {
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
        <button
          type="button"
          onClick={onSearchClick}
          className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 text-sm text-text-muted bg-surface-1 border border-border-muted rounded-lg hover:bg-surface-2 transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search</span>
          <kbd className="text-[10px] px-1 py-0.5 bg-surface-2 border border-border-muted rounded ml-2 font-mono">
            ⌘K
          </kbd>
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
