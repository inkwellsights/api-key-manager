import Link from "next/link";

interface UsageRow {
  id: string;
  application_name: string | null;
  endpoint: string | null;
  method: string | null;
  status_code: number | null;
  response_time_ms: number | null;
  created_at: string;
}

interface RecentUsageProps {
  rows: UsageRow[];
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function StatusPill({ code }: { code: number | null }) {
  if (code === null) return <span className="text-text-muted text-xs">--</span>;

  const isSuccess = code >= 200 && code < 300;
  const styles = isSuccess
    ? { bg: "rgba(34,197,94,0.15)", color: "var(--green)", border: "rgba(34,197,94,0.3)" }
    : { bg: "rgba(239,68,68,0.15)", color: "var(--red)", border: "rgba(239,68,68,0.3)" };

  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border"
      style={{ background: styles.bg, color: styles.color, borderColor: styles.border }}
    >
      {code}
    </span>
  );
}

export function RecentUsage({ rows }: RecentUsageProps) {
  return (
    <section className="rounded-xl border border-border bg-panel shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-text">Recent API Usage</h2>
        <Link
          href="/logs"
          className="text-xs font-medium text-accent hover:text-accent/80 transition-colors"
        >
          View All Logs
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-text-muted">
          <p className="text-sm">No recent usage logs found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left text-xs font-medium text-text-muted">
                  Time
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-text-muted">
                  API Key
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-text-muted">
                  Endpoint
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-text-muted">
                  Status
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium text-text-muted">
                  Response Time
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border/50 last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-5 py-3 text-xs text-text-muted whitespace-nowrap">
                    {formatTime(row.created_at)}
                  </td>
                  <td className="px-5 py-3 text-xs text-text">
                    {row.application_name ?? <span className="text-text-muted">Unknown</span>}
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs text-text whitespace-nowrap">
                      {row.method && row.endpoint
                        ? `${row.method} ${row.endpoint}`
                        : row.endpoint ?? "--"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <StatusPill code={row.status_code} />
                  </td>
                  <td className="px-5 py-3 text-right text-xs text-text-muted whitespace-nowrap">
                    {row.response_time_ms !== null ? `${row.response_time_ms}ms` : "--"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
