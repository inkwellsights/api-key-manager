"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, ExternalLink, Calendar } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { createApplication, deleteApplication } from "@/server/applications";
import type { Application } from "@/lib/types";

interface ApplicationsManagerProps {
  apps: Application[];
}

export function ApplicationsManager({ apps }: ApplicationsManagerProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Create form state
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setCreateError("Application name is required.");
      return;
    }
    setCreateError(null);
    setIsCreating(true);
    startTransition(async () => {
      try {
        await createApplication({
          name: trimmedName,
          url: url.trim() || undefined,
        });
        setName("");
        setUrl("");
        router.refresh();
      } catch (err: unknown) {
        setCreateError(
          err instanceof Error ? err.message : "Failed to create application."
        );
      } finally {
        setIsCreating(false);
      }
    });
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleteError(null);
    setIsDeleting(true);
    startTransition(async () => {
      try {
        await deleteApplication(deleteId);
        setDeleteId(null);
        router.refresh();
      } catch (err: unknown) {
        setDeleteError(
          err instanceof Error ? err.message : "Failed to delete application."
        );
      } finally {
        setIsDeleting(false);
      }
    });
  }

  const appToDelete = apps.find((a) => a.id === deleteId);

  return (
    <div className="space-y-6">
      {/* New Application form */}
      <section className="rounded-xl border border-border bg-panel shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-text">New Application</h2>
          <p className="mt-0.5 text-xs text-text-muted">
            Register a new application to generate API keys for it.
          </p>
        </div>

        <form onSubmit={handleCreate} className="p-5 space-y-4">
          {createError && (
            <div
              className="rounded-lg border px-3 py-2 text-xs"
              style={{
                color: "var(--red)",
                background: "rgba(239,68,68,0.1)",
                borderColor: "rgba(239,68,68,0.3)",
              }}
            >
              {createError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="app-name"
                className="block text-xs font-medium text-text-muted mb-1.5"
              >
                Name{" "}
                <span aria-hidden="true" style={{ color: "var(--red)" }}>
                  *
                </span>
              </label>
              <input
                id="app-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Application"
                required
                disabled={isCreating}
                className="w-full rounded-lg border border-border bg-bg/60 px-3 py-2 text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent min-h-[36px] disabled:opacity-50"
              />
            </div>
            <div>
              <label
                htmlFor="app-url"
                className="block text-xs font-medium text-text-muted mb-1.5"
              >
                URL{" "}
                <span className="text-text-muted/60 font-normal">(optional)</span>
              </label>
              <input
                id="app-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://myapp.example.com"
                disabled={isCreating}
                className="w-full rounded-lg border border-border bg-bg/60 px-3 py-2 text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent min-h-[36px] disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium text-white min-h-[36px] disabled:opacity-50 transition-colors hover:opacity-90"
              style={{ background: "var(--accent)" }}
            >
              <Plus size={14} aria-hidden="true" />
              {isCreating ? "Creating..." : "Create Application"}
            </button>
          </div>
        </form>
      </section>

      {/* Applications list */}
      <section className="rounded-xl border border-border bg-panel shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-text">
            Applications{" "}
            <span className="font-normal text-text-muted">
              ({apps.length})
            </span>
          </h2>
        </div>

        {apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-text-muted">
            <p className="text-sm">No applications yet.</p>
            <p className="mt-1 text-xs">
              Create your first application using the form above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Name", "URL", "Created", ""].map((col) => (
                    <th
                      key={col}
                      className={`px-5 py-3 text-xs font-medium text-text-muted ${
                        col === "" ? "text-right" : "text-left"
                      }`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {apps.map((app) => {
                  const created = new Date(app.created_at).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric", year: "numeric" }
                  );
                  return (
                    <tr
                      key={app.id}
                      className="border-b border-border/50 last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3">
                        <p className="text-xs font-medium text-text">
                          {app.name}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        {app.url ? (
                          <a
                            href={app.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs hover:underline"
                            style={{ color: "var(--accent)" }}
                          >
                            {app.url}
                            <ExternalLink size={10} aria-hidden="true" />
                          </a>
                        ) : (
                          <span className="text-xs text-text-muted">--</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-text-muted">
                          <Calendar size={12} aria-hidden="true" />
                          {created}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteId(app.id);
                            setDeleteError(null);
                          }}
                          aria-label={`Delete ${app.name}`}
                          className="inline-flex items-center justify-center rounded-md p-1.5 min-w-[32px] min-h-[32px] hover:bg-white/10 transition-colors"
                          style={{ color: "var(--red)" }}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Delete confirm modal */}
      <Modal
        open={deleteId !== null}
        onClose={() => {
          setDeleteId(null);
          setDeleteError(null);
        }}
        title="Delete Application"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Are you sure you want to delete{" "}
            <strong className="text-text">{appToDelete?.name}</strong>? This
            will permanently delete all associated API keys and usage logs. This
            action cannot be undone.
          </p>

          {deleteError && (
            <div
              className="rounded-lg border px-3 py-2 text-xs"
              style={{
                color: "var(--red)",
                background: "rgba(239,68,68,0.1)",
                borderColor: "rgba(239,68,68,0.3)",
              }}
            >
              {deleteError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setDeleteId(null);
                setDeleteError(null);
              }}
              disabled={isDeleting}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted min-h-[40px] hover:bg-white/5 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white min-h-[40px] disabled:opacity-50 transition-colors"
              style={{ background: "var(--red)" }}
            >
              {isDeleting ? "Deleting..." : "Delete Application"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
