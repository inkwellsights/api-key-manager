"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  KeyRound,
  ScrollText,
  Boxes,
  Settings,
  FileText,
  Link2,
  X,
  BookOpen,
} from "lucide-react";

const QUOTA = 30_000;

const NAV_LINKS = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/keys", label: "API Keys", Icon: KeyRound },
  { href: "/logs", label: "Usage Logs", Icon: ScrollText },
  { href: "/applications", label: "Applications", Icon: Boxes },
  { href: "/settings", label: "Settings", Icon: Settings },
  { href: "/docs", label: "Documentation", Icon: FileText },
] as const;

// Very simple sparkline — 8 bars representing stylised trend
function Sparkline({ pct }: { pct: number }) {
  const bars = [0.3, 0.5, 0.4, 0.7, 0.6, 0.8, 0.75, Math.min(1, pct / 100)];
  return (
    <svg
      viewBox="0 0 64 20"
      className="h-5 w-16"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      {bars.map((h, i) => (
        <rect
          key={i}
          x={i * 8 + 1}
          y={20 - h * 20}
          width={6}
          height={h * 20}
          rx={1}
          fill="var(--accent)"
          opacity={0.4 + h * 0.6}
        />
      ))}
    </svg>
  );
}

interface SidebarProps {
  requestsThisMonth: number;
  total: number;
  /** Used in mobile drawer mode only — shows close button */
  onClose?: () => void;
}

export function Sidebar({ requestsThisMonth, total, onClose }: SidebarProps) {
  const pathname = usePathname();
  const usagePct = Math.min(100, Math.round((requestsThisMonth / QUOTA) * 100));

  return (
    <aside
      className="flex h-full w-64 flex-col border-r border-border bg-panel"
      style={{ minHeight: "100dvh" }}
    >
      {/* Logo + wordmark */}
      <div className="flex items-center justify-between px-5 py-5">
        <Link href="/" className="flex items-center gap-3 group">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/20 ring-1 ring-accent/40 group-hover:bg-accent/30 transition-colors">
            <Link2 size={17} className="text-accent" />
          </span>
          <span className="font-semibold text-sm leading-tight text-text">
            API Key
            <br />
            <span className="text-text-muted font-normal text-xs">Manager</span>
          </span>
        </Link>
        {/* Close button — only shown in mobile drawer */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="inline-flex items-center justify-center rounded-lg p-1.5 min-w-[40px] min-h-[40px] text-text-muted hover:bg-white/10 transition-colors lg:hidden"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5" aria-label="Main navigation">
        {NAV_LINKS.map(({ href, label, Icon }) => {
          const isActive =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(href + "/");

          return (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[40px] ${
                isActive
                  ? "text-accent"
                  : "text-text-muted hover:text-text hover:bg-white/5"
              }`}
              style={
                isActive
                  ? {
                      background:
                        "color-mix(in srgb, var(--accent) 13%, transparent)",
                    }
                  : undefined
              }
              onClick={onClose}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Left accent bar */}
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-accent"
                  aria-hidden="true"
                />
              )}
              <Icon size={16} aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* API Usage card */}
      <div className="mx-3 mb-3 rounded-xl border border-border bg-bg/60 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
            API Usage
          </span>
          <Sparkline pct={usagePct} />
        </div>
        <p className="text-2xl font-bold text-text tabular-nums">
          {requestsThisMonth.toLocaleString()}
        </p>
        <p className="text-xs text-text-muted mt-0.5">requests this month</p>
        <p className="text-xs text-accent mt-0.5">
          {usagePct >= 0 ? `+${usagePct}%` : `${usagePct}%`} of quota used
        </p>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${usagePct}%` }}
            role="progressbar"
            aria-valuenow={requestsThisMonth}
            aria-valuemin={0}
            aria-valuemax={QUOTA}
            aria-label={`${requestsThisMonth.toLocaleString()} of ${QUOTA.toLocaleString()} quota`}
          />
        </div>
        <p className="text-xs text-text-muted mt-1.5 tabular-nums">
          {requestsThisMonth.toLocaleString()} of {QUOTA.toLocaleString()} quota
        </p>
      </div>

      {/* Need Help? card */}
      <div className="mx-3 mb-4 rounded-xl border border-border bg-bg/60 p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <BookOpen size={14} className="text-accent" />
          <span className="text-sm font-medium text-text">Need Help?</span>
        </div>
        <p className="text-xs text-text-muted mb-3 leading-relaxed">
          Browse the docs for API guides and integration examples.
        </p>
        <Link
          href="/docs"
          onClick={onClose}
          className="inline-flex w-full items-center justify-center rounded-lg border border-accent/40 px-3 py-2 text-xs font-medium text-accent min-h-[40px] hover:bg-accent/10 transition-colors"
        >
          View Docs
        </Link>
      </div>
    </aside>
  );
}
