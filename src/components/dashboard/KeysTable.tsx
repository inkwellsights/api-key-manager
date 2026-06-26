"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Eye, Trash2, ChevronLeft, ChevronRight, PauseCircle, PlayCircle, Search } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CopyButton } from "@/components/ui/CopyButton";
import { RevealKeyDialog } from "@/components/keys/RevealKeyDialog";
import { Modal } from "@/components/ui/Modal";
import { setKeyStatus, revokeKey } from "@/server/keys";
import type { ApiKeyWithApp, KeyStatus } from "@/lib/types";

// Deterministic avatar palette
const AVATAR_PALETTE = [
  { bg: "rgba(124,92,255,0.2)", color: "#7c5cff" },
  { bg: "rgba(59,130,246,0.2)", color: "#60a5fa" },
  { bg: "rgba(34,197,94,0.2)", color: "#22c55e" },
  { bg: "rgba(245,158,11,0.2)", color: "#f59e0b" },
  { bg: "rgba(239,68,68,0.2)", color: "#ef4444" },
  { bg: "rgba(236,72,153,0.2)", color: "#f472b6" },
  { bg: "rgba(6,182,212,0.2)", color: "#22d3ee" },
  { bg: "rgba(249,115,22,0.2)", color: "#fb923c" },
];

function getAvatarStyle(name: string) {
  const idx = (name.charCodeAt(0) ?? 0) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[idx];
}

function formatDateParts(dateStr: string): { date: string; time: string } {
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
  };
}

interface KeysTableProps {
  rows: ApiKeyWithApp[];
  total: number;
  page: number;
  q: string;
  status: KeyStatus | "all";
  pageSize?: number;
}

export function KeysTable({ rows, total, page, q, status, pageSize = 6 }: KeysTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(q);
  const [revealId, setRevealId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [tableError, setTableError] = useState<string | null>(null);
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep search value in sync when URL changes (e.g. browser back)
  useEffect(() => {
    setSearchValue(q);
  }, [q]);

  function pushParams(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    if (searchValue && !("q" in overrides)) params.set("q", searchValue);
    if (status !== "all" && !("status" in overrides)) params.set("status", status);
    if (page > 1 && !("page" in overrides)) params.set("page", String(page));
    Object.entries(overrides).forEach(([k, v]) => {
      if (v && v !== "all" && v !== "1") params.set(k, v);
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const params = new URLSearchParams();
        if (value) params.set("q", value);
        if (status !== "all") params.set("status", status);
        // Reset page on new search
        router.push(`${pathname}?${params.toString()}`);
      }, 350);
    },
    [router, status, pathname]
  );

  function handleStatusChange(val: string) {
    const params = new URLSearchParams();
    if (searchValue) params.set("q", searchValue);
    if (val !== "all") params.set("status", val);
    router.push(`${pathname}?${params.toString()}`);
  }

  async function handleToggleStatus(id: string, current: KeyStatus) {
    if (current === "revoked") return;
    const next = current === "active" ? "disabled" : "active";
    setTableError(null);
    startTransition(async () => {
      try {
        await setKeyStatus(id, next);
        router.refresh();
      } catch (err: unknown) {
        setTableError(err instanceof Error ? err.message : "Failed to update key status");
      }
    });
  }

  async function confirmRevoke() {
    if (!revokeConfirmId) return;
    const id = revokeConfirmId;
    setRevokeConfirmId(null);
    setRevoking(id);
    setTableError(null);
    try {
      await revokeKey(id);
      router.refresh();
    } catch (err: unknown) {
      setTableError(err instanceof Error ? err.message : "Failed to revoke key");
    } finally {
      setRevoking(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <section className="rounded-xl border border-border bg-panel shadow-sm">
      {/* Header + filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-text">API Keys</h2>
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-lg border border-border bg-bg/60 px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-accent min-h-[36px]"
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
            <option value="revoked">Revoked</option>
          </select>

          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search keys..."
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="rounded-lg border border-border bg-bg/60 pl-8 pr-3 py-2 text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent min-h-[36px] w-48"
              aria-label="Search API keys"
            />
          </div>
        </div>
      </div>

      {/* Inline error banner */}
      {tableError && (
        <div
          className="mx-5 mt-4 rounded-lg border px-3 py-2 text-xs"
          style={{ color: "var(--red)", background: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.3)" }}
        >
          {tableError}
        </div>
      )}

      {/* Table */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-text-muted">
          <p className="text-sm">No API keys found.</p>
          {(q || status !== "all") && (
            <p className="mt-1 text-xs">Try adjusting your search or filter.</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Application", "API Key", "Status", "Created", "Last Used", "Requests", "Actions"].map(
                  (col) => (
                    <th
                      key={col}
                      className={`px-5 py-3 text-xs font-medium text-text-muted ${
                        col === "Requests" || col === "Actions" ? "text-right" : "text-left"
                      }`}
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const avatar = getAvatarStyle(row.application.name);
                const masked = `${row.key_prefix}...${row.last_four}`;
                const created = formatDateParts(row.created_at);
                const lastUsed = row.last_used_at ? formatDateParts(row.last_used_at) : null;

                return (
                  <tr
                    key={row.id}
                    className="border-b border-border/50 last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Application */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold uppercase"
                          style={{ background: avatar.bg, color: avatar.color }}
                          aria-hidden="true"
                        >
                          {row.application.name.charAt(0)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-text text-xs truncate max-w-[120px]">
                            {row.application.name}
                          </p>
                          {row.application.url && (
                            <p className="text-xs text-text-muted truncate max-w-[120px]">
                              {row.application.url}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* API Key masked */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs text-text whitespace-nowrap rounded-md bg-bg/60 border border-border px-2 py-1">
                          {masked}
                        </span>
                        <CopyButton value={masked} />
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3">
                      <StatusBadge status={row.status} />
                    </td>

                    {/* Created */}
                    <td className="px-5 py-3">
                      <p className="text-xs text-text">{created.date}</p>
                      <p className="text-xs text-text-muted">{created.time}</p>
                    </td>

                    {/* Last Used */}
                    <td className="px-5 py-3">
                      {lastUsed ? (
                        <>
                          <p className="text-xs text-text">{lastUsed.date}</p>
                          <p className="text-xs text-text-muted">{lastUsed.time}</p>
                        </>
                      ) : (
                        <span className="text-xs text-text-muted">Never</span>
                      )}
                    </td>

                    {/* Requests */}
                    <td className="px-5 py-3 text-right">
                      <span className="text-xs text-text tabular-nums">
                        {row.request_count.toLocaleString()}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Reveal */}
                        <button
                          type="button"
                          onClick={() => setRevealId(row.id)}
                          aria-label="Reveal API key"
                          className="inline-flex items-center justify-center rounded-md p-1.5 min-w-[32px] min-h-[32px] text-text-muted hover:text-text hover:bg-white/10 transition-colors"
                        >
                          <Eye size={14} aria-hidden="true" />
                        </button>

                        {/* Toggle status (active <-> disabled only) */}
                        {row.status !== "revoked" && (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(row.id, row.status)}
                            aria-label={row.status === "active" ? "Disable key" : "Enable key"}
                            className="inline-flex items-center justify-center rounded-md p-1.5 min-w-[32px] min-h-[32px] hover:bg-white/10 transition-colors"
                            style={{
                              color:
                                row.status === "active"
                                  ? "var(--amber)"
                                  : "var(--green)",
                            }}
                          >
                            {row.status === "active" ? (
                              <PauseCircle size={14} aria-hidden="true" />
                            ) : (
                              <PlayCircle size={14} aria-hidden="true" />
                            )}
                          </button>
                        )}

                        {/* Revoke */}
                        {row.status !== "revoked" && (
                          <button
                            type="button"
                            onClick={() => setRevokeConfirmId(row.id)}
                            disabled={revoking === row.id}
                            aria-label="Revoke API key"
                            className="inline-flex items-center justify-center rounded-md p-1.5 min-w-[32px] min-h-[32px] text-text-muted hover:bg-white/10 transition-colors disabled:opacity-50"
                            style={{ color: "var(--red)" }}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
        <p className="text-xs text-text-muted">
          {total === 0
            ? "No results"
            : `Showing ${from} to ${to} of ${total} result${total !== 1 ? "s" : ""}`}
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => pushParams({ page: String(page - 1) })}
              disabled={page <= 1}
              aria-label="Previous page"
              className="inline-flex items-center justify-center rounded-md p-1.5 min-w-[32px] min-h-[32px] text-text-muted hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} aria-hidden="true" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => pushParams({ page: String(p) })}
                aria-label={`Page ${p}`}
                aria-current={p === page ? "page" : undefined}
                className="inline-flex items-center justify-center rounded-md px-2.5 py-1 text-xs min-w-[32px] min-h-[32px] transition-colors"
                style={
                  p === page
                    ? { background: "var(--accent)", color: "#fff" }
                    : { color: "var(--text-muted)" }
                }
              >
                {p}
              </button>
            ))}

            <button
              type="button"
              onClick={() => pushParams({ page: String(page + 1) })}
              disabled={page >= totalPages}
              aria-label="Next page"
              className="inline-flex items-center justify-center rounded-md p-1.5 min-w-[32px] min-h-[32px] text-text-muted hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {/* Revoke confirm modal */}
      <Modal open={revokeConfirmId !== null} onClose={() => setRevokeConfirmId(null)} title="Revoke API Key">
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Are you sure you want to revoke this API key? This action cannot be undone and the key will stop working immediately.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setRevokeConfirmId(null)}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted min-h-[40px] hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmRevoke}
              className="flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white min-h-[40px] disabled:opacity-50 transition-colors"
              style={{ background: "var(--red)" }}
            >
              Revoke Key
            </button>
          </div>
        </div>
      </Modal>

      {/* Reveal dialog */}
      <RevealKeyDialog
        id={revealId ?? ""}
        open={revealId !== null}
        onClose={() => setRevealId(null)}
      />
    </section>
  );
}
