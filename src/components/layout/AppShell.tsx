import { useCallback, useEffect, useRef, useState } from "react";
import { useFileWatcher } from "@/hooks/useFileWatcher.js";
import { cn } from "@/lib/utils";
import { CommandPalette } from "../search/CommandPalette";
import Header from "./Header";
import Sidebar from "./Sidebar";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
}

export function AppShell({ children, title }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  useFileWatcher();

  const openSidebar = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    setSidebarOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    previousFocusRef.current?.focus();
    previousFocusRef.current = null;
  }, []);

  useEffect(() => {
    if (sidebarOpen) {
      requestAnimationFrame(() => {
        const firstLink = sidebarRef.current?.querySelector("a, button");
        if (firstLink instanceof HTMLElement) {
          firstLink.focus();
        }
      });
    }
  }, [sidebarOpen]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setPaletteOpen(true);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-0">
      {/* Backdrop — mobile only, when sidebar is open */}
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          aria-label="Close sidebar"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar — always visible on md+, overlay on mobile when open */}
      <div
        ref={sidebarRef}
        className={cn(
          "fixed inset-y-0 left-0 z-30 md:relative md:z-auto",
          "transition-transform duration-200 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <Sidebar onClose={closeSidebar} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          title={title}
          onMenuClick={openSidebar}
          onSearchClick={() => setPaletteOpen(true)}
        />
        <main id="main-content" className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
