"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { CopyButton } from "@/components/ui/CopyButton";
import { listApplications } from "@/server/applications";
import { createKey } from "@/server/keys";
import type { Application } from "@/lib/types";

type Step = "form" | "success";

export function NewKeyModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [applicationId, setApplicationId] = useState("");
  const [environment, setEnvironment] = useState<"live" | "test">("live");
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Load applications when the modal opens
  useEffect(() => {
    if (!open) return;
    setLoadingApps(true);
    listApplications()
      .then((apps) => {
        setApplications(apps);
        if (apps.length > 0) setApplicationId(apps[0].id);
        setLoadingApps(false);
      })
      .catch((err: unknown) => {
        setLoadingApps(false);
        setError(err instanceof Error ? err.message : "Failed to load applications");
      });
  }, [open]);

  function handleOpen() {
    setStep("form");
    setPlaintext(null);
    setError(null);
    setApplicationId("");
    setEnvironment("live");
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    if (step === "success") {
      router.refresh();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!applicationId) {
      setError("Please select an application.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await createKey({ applicationId, environment });
        setPlaintext(result.plaintext);
        setStep("success");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to create key";
        setError(msg);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white min-h-[40px] hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-panel transition-colors"
      >
        <Plus size={16} aria-hidden="true" />
        <span className="hidden sm:inline">New API Key</span>
        <span className="sm:hidden">New</span>
      </button>

      <Modal
        open={open}
        onClose={handleClose}
        title={step === "form" ? "Create New API Key" : "API Key Created"}
      >
        {step === "form" ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Application select */}
            <div className="space-y-1.5">
              <label
                htmlFor="nk-application"
                className="block text-sm font-medium text-text"
              >
                Application
              </label>
              {loadingApps ? (
                <div className="h-10 rounded-lg border border-border bg-bg/60 animate-pulse" />
              ) : (
                <select
                  id="nk-application"
                  value={applicationId}
                  onChange={(e) => setApplicationId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent min-h-[40px]"
                  required
                >
                  {applications.length === 0 ? (
                    <option value="">No applications found</option>
                  ) : (
                    applications.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.name}
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>

            {/* Environment */}
            <div className="space-y-1.5">
              <span className="block text-sm font-medium text-text">
                Environment
              </span>
              <div className="flex gap-3">
                {(["live", "test"] as const).map((env) => (
                  <label
                    key={env}
                    className="flex flex-1 cursor-pointer items-center gap-2.5 rounded-lg border px-4 py-3 transition-colors"
                    style={{
                      borderColor:
                        environment === env
                          ? "var(--accent)"
                          : "var(--border)",
                      background:
                        environment === env
                          ? "rgba(124,92,255,0.08)"
                          : "transparent",
                    }}
                  >
                    <input
                      type="radio"
                      name="environment"
                      value={env}
                      checked={environment === env}
                      onChange={() => setEnvironment(env)}
                      className="accent-accent"
                    />
                    <span className="text-sm font-medium text-text capitalize">
                      {env}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <p
                className="text-sm rounded-lg px-3 py-2 border"
                style={{
                  color: "var(--red)",
                  background: "rgba(239,68,68,0.1)",
                  borderColor: "rgba(239,68,68,0.3)",
                }}
              >
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted min-h-[40px] hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || loadingApps || applications.length === 0}
                className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white min-h-[40px] hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? "Creating..." : "Create Key"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-5">
            {/* Success message */}
            <div
              className="flex items-start gap-3 rounded-lg border px-4 py-3"
              style={{
                background: "rgba(34,197,94,0.08)",
                borderColor: "rgba(34,197,94,0.3)",
              }}
            >
              <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: "var(--amber)" }} aria-hidden="true" />
              <p className="text-sm" style={{ color: "var(--amber)" }}>
                You will not be able to see this key again. Copy it now and store it securely.
              </p>
            </div>

            {/* Key display */}
            <div>
              <p className="mb-2 text-xs font-medium text-text-muted">Your new API key</p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-bg/80 px-3 py-2.5">
                <span className="flex-1 break-all font-mono text-sm text-text">
                  {plaintext}
                </span>
                <CopyButton value={plaintext ?? ""} />
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white min-h-[40px] hover:bg-accent/90 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </Modal>
    </>
  );
}
