import Link from "next/link";
import { listLogs } from "@/server/logs";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const PAGE_SIZE = 20;

function formatLogTime(dateStr: string): string {
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

function HttpStatusPill({ code }: { code: number | null }) {
  const isSuccess = code !== null && code >= 200 && code < 300;
  const isError = code !== null && code >= 400;

  const className = isSuccess
    ? "bg-green/15 text-green border border-green/30"
    : isError
      ? "bg-red/15 text-red border border-red/30"
      : "bg-text-muted/15 text-text-muted border border-text-muted/30";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums ${className}`}
    >
      {code ?? "--"}
    </span>
  );
}

export default async function LogsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const rawPage = Math.max(
    1,
    parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1
  );

  const { rows: fetchedRows, total } = await listLogs({ page: rawPage, pageSize: PAGE_SIZE });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const clampedPage = total === 0 ? 1 : Math.min(rawPage, totalPages);

  let rows = fetchedRows;
  if (clampedPage !== rawPage) {
    const { rows: refetchedRows } = await listLogs({ page: clampedPage, pageSize: PAGE_SIZE });
    rows = refetchedRows;
  }

  const from = total === 0 ? 0 : (clampedPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(clampedPage * PAGE_SIZE, total);

  const prevPage = clampedPage > 1 ? clampedPage - 1 : null;
  const nextPage = clampedPage < totalPages ? clampedPage + 1 : null;

  const TABLE_COLS = ["Time", "Application", "Endpoint", "Method", "Status", "Response Time"];

  return (
    <section className="rounded-xl border border-border bg-panel shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <Clock size={16} className="text-text-muted" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-text">Usage Logs</h2>
        <span className="ml-auto text-xs text-text-muted tabular-nums">
          {total.toLocaleString()} total
        </span>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-text-muted">
          <p className="text-sm">No usage logs found.</p>
          <p className="mt-1 text-xs">Logs appear here after your first API request.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-border">
                {TABLE_COLS.map((col) => (
                  <th
                    key={col}
                    className={`px-5 py-3 text-xs font-medium text-text-muted ${
                      col === "Response Time" ? "text-right" : "text-left"
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border/50 last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Time */}
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span className="text-xs text-text-muted tabular-nums">
                      {formatLogTime(row.created_at)}
                    </span>
                  </td>

                  {/* Application */}
                  <td className="px-5 py-3">
                    {row.application_name ? (
                      <span className="text-xs text-text">{row.application_name}</span>
                    ) : (
                      <span className="text-xs text-text-muted">--</span>
                    )}
                  </td>

                  {/* Endpoint */}
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs text-text-muted whitespace-nowrap">
                      {row.endpoint ?? "/"}
                    </span>
                  </td>

                  {/* Method */}
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs text-text">{row.method ?? "--"}</span>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3">
                    <HttpStatusPill code={row.status_code} />
                  </td>

                  {/* Response Time */}
                  <td className="px-5 py-3 text-right">
                    <span className="text-xs text-text-muted tabular-nums">
                      {row.response_time_ms !== null ? `${row.response_time_ms}ms` : "--"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
        <p className="text-xs text-text-muted">
          {total === 0
            ? "No results"
            : `Showing ${from} to ${to} of ${total.toLocaleString()}`}
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            {prevPage ? (
              <Link
                href={`/logs?page=${prevPage}`}
                aria-label="Previous page"
                className="inline-flex items-center justify-center rounded-md p-1.5 min-w-[32px] min-h-[32px] text-text-muted hover:bg-white/10 transition-colors"
              >
                <ChevronLeft size={14} aria-hidden="true" />
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex items-center justify-center rounded-md p-1.5 min-w-[32px] min-h-[32px] text-text-muted opacity-40 cursor-not-allowed"
              >
                <ChevronLeft size={14} aria-hidden="true" />
              </span>
            )}

            <span className="px-2 text-xs text-text-muted tabular-nums">
              {clampedPage} / {totalPages}
            </span>

            {nextPage ? (
              <Link
                href={`/logs?page=${nextPage}`}
                aria-label="Next page"
                className="inline-flex items-center justify-center rounded-md p-1.5 min-w-[32px] min-h-[32px] text-text-muted hover:bg-white/10 transition-colors"
              >
                <ChevronRight size={14} aria-hidden="true" />
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="inline-flex items-center justify-center rounded-md p-1.5 min-w-[32px] min-h-[32px] text-text-muted opacity-40 cursor-not-allowed"
              >
                <ChevronRight size={14} aria-hidden="true" />
              </span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
