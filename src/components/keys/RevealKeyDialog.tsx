"use client";

import { useEffect, useState } from "react";
import { revealKey } from "@/server/keys";
import { Modal } from "@/components/ui/Modal";
import { CopyButton } from "@/components/ui/CopyButton";
import { KeyRound } from "lucide-react";

interface RevealKeyDialogProps {
  id: string;
  open: boolean;
  onClose: () => void;
}

export function RevealKeyDialog({ id, open, onClose }: RevealKeyDialogProps) {
  const [key, setKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !id) return;
    setKey(null);
    setError(null);
    setLoading(true);
    revealKey(id)
      .then((k) => {
        setKey(k);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message ?? "Failed to reveal key");
        setLoading(false);
      });
  }, [open, id]);

  function handleClose() {
    setKey(null);
    setError(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Reveal API Key">
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div
            className="size-6 animate-spin rounded-full border-2 border-border"
            style={{ borderTopColor: "var(--accent)" }}
            aria-label="Loading key"
          />
        </div>
      )}

      {error && (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{
            background: "rgba(239,68,68,0.1)",
            borderColor: "rgba(239,68,68,0.3)",
            color: "var(--red)",
          }}
        >
          {error}
        </div>
      )}

      {key && !loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-bg/80 px-3 py-2.5">
            <KeyRound size={14} className="shrink-0 text-text-muted" aria-hidden="true" />
            <span className="flex-1 break-all font-mono text-sm text-text">{key}</span>
            <CopyButton value={key} />
          </div>
          <p className="text-xs text-text-muted">
            This is your full API key. Store it securely and do not share it.
          </p>
        </div>
      )}
    </Modal>
  );
}
