"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { NewKeyModal } from "@/components/keys/NewKeyModal";

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "Dashboard",
    subtitle: "Manage and secure your API keys",
  },
  "/keys": {
    title: "API Keys",
    subtitle: "View, create, and manage your API keys",
  },
  "/logs": {
    title: "Usage Logs",
    subtitle: "Monitor API request activity across all keys",
  },
  "/applications": {
    title: "Applications",
    subtitle: "Manage your connected applications",
  },
  "/settings": {
    title: "Settings",
    subtitle: "Dashboard configuration and environment info",
  },
  "/docs": {
    title: "Documentation",
    subtitle: "API reference, authentication guides, and examples",
  },
};

interface TopBarProps {
  /** Callback to toggle the mobile sidebar drawer */
  onMenuToggle: () => void;
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  const pathname = usePathname();

  // Match exact or prefix (e.g. /keys/abc -> /keys)
  const matchedPath =
    Object.keys(PAGE_META).find(
      (p) => p !== "/" && pathname.startsWith(p)
    ) ?? (pathname === "/" ? "/" : null);

  const { title, subtitle } =
    PAGE_META[matchedPath ?? pathname] ??
    PAGE_META["/"];

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-panel px-4 lg:px-6">
      {/* Left: hamburger (mobile) + page title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label="Open navigation menu"
          className="inline-flex items-center justify-center rounded-lg p-2 min-w-[40px] min-h-[40px] text-text-muted hover:bg-white/10 transition-colors lg:hidden"
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        <div className="min-w-0">
          <h1 className="text-base font-semibold text-text truncate leading-tight">
            {title}
          </h1>
          <p className="text-xs text-text-muted truncate leading-tight">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right: New API Key modal trigger */}
      <NewKeyModal />
    </header>
  );
}
