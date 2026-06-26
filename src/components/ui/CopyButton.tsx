"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  value: string;
  className?: string;
}

export function CopyButton({ value, className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API not available (e.g. non-HTTPS dev)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
      className={`inline-flex items-center justify-center rounded-md p-1.5 min-w-[40px] min-h-[40px] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
    >
      {copied ? (
        <Check size={15} className="text-green" />
      ) : (
        <Copy size={15} className="text-text-muted" />
      )}
    </button>
  );
}
