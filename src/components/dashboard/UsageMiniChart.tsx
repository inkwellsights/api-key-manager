/**
 * UsageMiniChart — small SVG sparkline + quota progress bar.
 * Used optionally in right-rail or sidebar contexts. The sidebar already
 * has a usage card, so this is kept as a standalone primitive for reuse.
 */

const QUOTA = 30_000;

interface UsageMiniChartProps {
  requestsThisMonth: number;
  quota?: number;
}

export function UsageMiniChart({
  requestsThisMonth,
  quota = QUOTA,
}: UsageMiniChartProps) {
  const pct = Math.min(100, Math.round((requestsThisMonth / quota) * 100));
  const bars = [0.3, 0.5, 0.4, 0.7, 0.6, 0.8, 0.75, Math.min(1, pct / 100)];

  return (
    <div className="rounded-xl border border-border bg-panel p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
          API Usage
        </span>
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
      </div>
      <p className="text-xl font-bold text-text tabular-nums">
        {requestsThisMonth.toLocaleString()}
      </p>
      <p className="text-xs text-text-muted mt-0.5">requests this month</p>
      <div className="mt-3 h-1.5 w-full rounded-full overflow-hidden bg-white/10">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={requestsThisMonth}
          aria-valuemin={0}
          aria-valuemax={quota}
          aria-label={`${requestsThisMonth.toLocaleString()} of ${quota.toLocaleString()} quota`}
        />
      </div>
      <p className="mt-1.5 text-xs text-text-muted tabular-nums">
        {requestsThisMonth.toLocaleString()} of {quota.toLocaleString()} quota
      </p>
    </div>
  );
}
