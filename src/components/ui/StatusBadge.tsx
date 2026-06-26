import type { KeyStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: KeyStatus;
}

const config: Record<KeyStatus, { label: string; classes: string }> = {
  active: {
    label: "Active",
    classes: "bg-green/15 text-green border border-green/30",
  },
  disabled: {
    label: "Disabled",
    classes: "bg-amber/15 text-amber border border-amber/30",
  },
  revoked: {
    label: "Revoked",
    classes: "bg-red/15 text-red border border-red/30",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, classes } = config[status] ?? config.revoked;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}
    >
      <span
        className="size-1.5 rounded-full"
        style={{
          backgroundColor:
            status === "active"
              ? "var(--green)"
              : status === "disabled"
                ? "var(--amber)"
                : "var(--red)",
        }}
      />
      {label}
    </span>
  );
}
