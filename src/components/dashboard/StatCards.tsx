import { Link2, ShieldCheck, PauseCircle, BarChart3 } from "lucide-react";

interface Stats {
  total: number;
  active: number;
  disabled: number;
  requestsThisMonth: number;
}

interface StatCardsProps {
  stats: Stats;
}

const CARDS = [
  {
    key: "total",
    label: "Total API Keys",
    sublabel: "All time",
    Icon: Link2,
    tile: { bg: "rgba(124,92,255,0.15)", color: "var(--accent)" },
  },
  {
    key: "active",
    label: "Active Keys",
    sublabel: "Currently active",
    Icon: ShieldCheck,
    tile: { bg: "rgba(34,197,94,0.15)", color: "var(--green)" },
  },
  {
    key: "disabled",
    label: "Disabled Keys",
    sublabel: "Temporarily disabled",
    Icon: PauseCircle,
    tile: { bg: "rgba(245,158,11,0.15)", color: "var(--amber)" },
  },
  {
    key: "requestsThisMonth",
    label: "Requests This Month",
    sublabel: "Across all keys",
    Icon: BarChart3,
    tile: { bg: "rgba(124,92,255,0.15)", color: "var(--accent)" },
  },
] as const;

export function StatCards({ stats }: StatCardsProps) {
  const values: Record<string, string | number> = {
    total: stats.total,
    active: stats.active,
    disabled: stats.disabled,
    requestsThisMonth: stats.requestsThisMonth.toLocaleString(),
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {CARDS.map(({ key, label, sublabel, Icon, tile }) => (
        <div
          key={key}
          className="rounded-xl border border-border bg-panel p-5 shadow-sm"
        >
          <div className="mb-4">
            <span
              className="inline-flex size-10 items-center justify-center rounded-lg"
              style={{ background: tile.bg }}
            >
              <Icon size={18} style={{ color: tile.color }} aria-hidden="true" />
            </span>
          </div>
          <p className="text-2xl font-bold text-text tabular-nums leading-none">
            {values[key]}
          </p>
          <p className="mt-1.5 text-sm font-medium text-text">{label}</p>
          <p className="mt-0.5 text-xs text-text-muted">{sublabel}</p>
        </div>
      ))}
    </div>
  );
}
