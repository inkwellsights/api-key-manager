"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface ShellClientProps {
  children: React.ReactNode;
  requestsThisMonth: number;
  total: number;
}

/**
 * Client boundary that manages the mobile sidebar drawer state.
 * The root layout (server) fetches stats and passes them here as props.
 * Sidebar + TopBar are both rendered here so the hamburger can toggle
 * the drawer without needing a context or lifting state further.
 */
export function ShellClient({
  children,
  requestsThisMonth,
  total,
}: ShellClientProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  function openDrawer() {
    setDrawerOpen(true);
  }
  function closeDrawer() {
    setDrawerOpen(false);
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* ── Desktop sidebar (always visible >= lg) ──────────────────── */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:overflow-y-auto">
        <Sidebar requestsThisMonth={requestsThisMonth} total={total} />
      </div>

      {/* ── Mobile drawer ──────────────────────────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
            onClick={closeDrawer}
          />
          {/* Slide-over panel */}
          <div className="relative flex w-64 shrink-0 flex-col overflow-y-auto shadow-2xl">
            <Sidebar
              requestsThisMonth={requestsThisMonth}
              total={total}
              onClose={closeDrawer}
            />
          </div>
        </div>
      )}

      {/* ── Main area ──────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <TopBar onMenuToggle={openDrawer} />
        <main className="flex-1 overflow-y-auto bg-bg p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
