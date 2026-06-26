"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, RefreshCw, Trash2, KeyRound } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CopyButton } from "@/components/ui/CopyButton";
import { Modal } from "@/components/ui/Modal";
import { RevealKeyDialog } from "@/components/keys/RevealKeyDialog";
import { regenerateKey, revokeKey } from "@/server/keys";
import type { ApiKeyWithApp } from "@/lib/types";

interface KeyDetailsPanelProps {
  rows: ApiKeyWithApp[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// The API Documentation card rendered below the key details
function ApiDocCard() {
  return (
    <section className="rounded-xl border border-border bg-panel shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-text">API Documentation</h2>
        <p className="mt-0.5 text-xs text-text-muted">
          All requests must include your API key in the Authorization header.
        </p>
      </div>

      <div className="p-5 space-y-4">
        {/* curl-style code block */}
        <div>
          <p className="mb-2 text-xs font-medium text-text-muted">Request Example</p>
          <div className="rounded-lg bg-bg border border-border p-3 font-mono text-xs leading-relaxed text-text-muted overflow-x-auto">
            <p>
              <span className="text-green" style={{ color: "var(--green)" }}>GET</span>{" "}
              /api/data
            </p>
            <p>Host: {"<your-app>"}</p>
            <p>
              Authorization:{" "}
              <span className="text-accent" style={{ color: "var(--accent)" }}>
                Bearer sk_live_...
              </span>
            </p>
            <p>Content-Type: application/json</p>
          </div>
        </div>

        {/* Example response */}
        <div>
          <p className="mb-2 text-xs font-medium text-text-muted">Example Response</p>
          <div className="rounded-lg bg-bg border border-border p-3 font-mono text-xs leading-relaxed overflow-x-auto">
            <p>{"{"}</p>
            <p className="pl-4">
              <span style={{ color: "var(--green)" }}>&quot;success&quot;</span>
              {": "}
              <span style={{ color: "var(--amber)" }}>true</span>
              {","}
            </p>
            <p className="pl-4">
              <span style={{ color: "var(--green)" }}>&quot;data&quot;</span>
              {": {"}
            </p>
            <p className="pl-8">
              <span style={{ color: "var(--green)" }}>&quot;message&quot;</span>
              {": "}
              <span style={{ color: "var(--amber)" }}>&quot;Here is your data&quot;</span>
            </p>
            <p className="pl-4">{"}"}</p>
            <p>{"}"}</p>
          </div>
        </div>

        <a
          href="/docs"
          className="inline-flex w-full items-center justify-center rounded-lg border border-border px-4 py-2 text-xs font-medium text-text-muted min-h-[36px] hover:bg-white/5 hover:text-text transition-colors"
        >
          View Full Documentation
        </a>
      </div>
    </section>
  );
}

export function KeyDetailsPanel({ rows }: KeyDetailsPanelProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [revealOpen, setRevealOpen] = useState(false);
  const [newPlaintext, setNewPlaintext] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  const key = rows[0] ?? null;

  if (!key) {
    return (
      <>
        <section className="rounded-xl border border-border bg-panel p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-text">Key Details</h2>
          <p className="text-xs text-text-muted">No API keys found. Create one to get started.</p>
        </section>
        <ApiDocCard />
      </>
    );
  }

  const masked = `${key.key_prefix}...${key.last_four}`;

  async function handleRegenerate() {
    if (!window.confirm("Regenerate this key? The old key will stop working immediately.")) return;
    setRegError(null);
    setRegenerating(true);
    try {
      const { plaintext } = await regenerateKey(key.id);
      setNewPlaintext(plaintext);
      // Refresh to update displayed data after a short delay
      startTransition(() => { router.refresh(); });
    } catch (err: unknown) {
      setRegError(err instanceof Error ? err.message : "Failed to regenerate key");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleRevoke() {
    setRevoking(true);
    try {
      await revokeKey(key.id);
      setRevokeConfirmOpen(false);
      router.refresh();
    } catch {
      // ignore
    } finally {
      setRevoking(false);
    }
  }

  return (
    <>
      {/* Key Details card */}
      <section className="rounded-xl border border-border bg-panel shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-text">Key Details</h2>
          <StatusBadge status={key.status} />
        </div>

        <div className="p-5 space-y-4">
          {/* Application */}
          <div>
            <p className="mb-1 text-xs text-text-muted">Application</p>
            <p className="text-sm font-medium text-text">{key.application.name}</p>
            {key.application.url && (
              <p className="text-xs text-text-muted">{key.application.url}</p>
            )}
          </div>

          {/* API Key */}
          <div>
            <p className="mb-1 text-xs text-text-muted">API Key</p>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-bg/80 px-3 py-2">
              <KeyRound size={12} className="shrink-0 text-text-muted" aria-hidden="true" />
              <span className="flex-1 font-mono text-xs text-text">{masked}</span>
              <CopyButton value={masked} />
              <button
                type="button"
                onClick={() => setRevealOpen(true)}
                aria-label="Reveal full key"
                className="inline-flex items-center justify-center rounded-md p-1.5 min-w-[32px] min-h-[32px] text-text-muted hover:text-text hover:bg-white/10 transition-colors"
              >
                <Eye size={13} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Meta row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-0.5 text-xs text-text-muted">Created</p>
              <p className="text-xs text-text">{formatDate(key.created_at)}</p>
            </div>
            <div>
              <p className="mb-0.5 text-xs text-text-muted">Last Used</p>
              <p className="text-xs text-text">
                {key.last_used_at ? formatDate(key.last_used_at) : "Never"}
              </p>
            </div>
            <div>
              <p className="mb-0.5 text-xs text-text-muted">Total Requests</p>
              <p className="text-xs text-text tabular-nums">
                {key.request_count.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="mb-0.5 text-xs text-text-muted">Rate Limit</p>
              <p className="text-xs text-text">
                {key.rate_limit.toLocaleString()} req/min
              </p>
            </div>
          </div>

          {/* Regenerated key box */}
          {newPlaintext && (
            <div
              className="rounded-lg border p-3 space-y-2"
              style={{ background: "rgba(124,92,255,0.08)", borderColor: "rgba(124,92,255,0.3)" }}
            >
              <p className="text-xs font-medium text-text">New key (visible once)</p>
              <div className="flex items-center gap-1 rounded bg-bg/80 border border-border px-2 py-1.5">
                <span className="flex-1 break-all font-mono text-xs text-text">{newPlaintext}</span>
                <CopyButton value={newPlaintext} />
              </div>
              <p className="text-xs text-text-muted">
                Store this key now. You will not be able to see it again.
              </p>
              <button
                type="button"
                onClick={() => setNewPlaintext(null)}
                className="text-xs text-text-muted hover:text-text transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}

          {regError && (
            <p className="text-xs rounded px-2 py-1 border" style={{ color: "var(--red)", background: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.3)" }}>
              {regError}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={regenerating || key.status === "revoked"}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white min-h-[40px] hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw size={14} aria-hidden="true" />
              {regenerating ? "Regenerating..." : "Regenerate Key"}
            </button>

            {key.status !== "revoked" && (
              <button
                type="button"
                onClick={() => setRevokeConfirmOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium min-h-[40px] hover:bg-white/5 transition-colors"
                style={{ borderColor: "var(--red)", color: "var(--red)" }}
              >
                <Trash2 size={14} aria-hidden="true" />
                Revoke Key
              </button>
            )}
          </div>
        </div>
      </section>

      {/* API Documentation card */}
      <ApiDocCard />

      {/* Reveal dialog */}
      <RevealKeyDialog
        id={key.id}
        open={revealOpen}
        onClose={() => setRevealOpen(false)}
      />

      {/* Revoke confirm modal */}
      <Modal open={revokeConfirmOpen} onClose={() => setRevokeConfirmOpen(false)} title="Revoke API Key">
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Are you sure you want to revoke{" "}
            <span className="font-mono text-text">{masked}</span>? This action cannot be undone and the key will stop working immediately.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setRevokeConfirmOpen(false)}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted min-h-[40px] hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRevoke}
              disabled={revoking}
              className="flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white min-h-[40px] disabled:opacity-50 transition-colors"
              style={{ background: "var(--red)" }}
            >
              {revoking ? "Revoking..." : "Revoke Key"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
