import { getStats, recentUsage } from "@/server/logs";
import { listKeys } from "@/server/keys";
import { StatCards } from "@/components/dashboard/StatCards";
import { KeysTable } from "@/components/dashboard/KeysTable";
import { KeyDetailsPanel } from "@/components/dashboard/KeyDetailsPanel";
import { RecentUsage } from "@/components/dashboard/RecentUsage";
import type { KeyStatus } from "@/lib/types";

// Force dynamic rendering so searchParams are always fresh
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const q = typeof params.q === "string" ? params.q : "";
  const rawStatus = typeof params.status === "string" ? params.status : "all";
  const status = (["active", "disabled", "revoked", "all"].includes(rawStatus)
    ? rawStatus
    : "all") as KeyStatus | "all";
  const PAGE_SIZE = 6;
  const rawPage = Math.max(1, parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);

  const [stats, { rows: fetchedRows, total }, usage] = await Promise.all([
    getStats(),
    listKeys({ search: q, status, page: rawPage, pageSize: PAGE_SIZE }),
    recentUsage(8),
  ]);

  const clampedPage = total === 0 ? 1 : Math.min(rawPage, Math.max(1, Math.ceil(total / PAGE_SIZE)));
  let rows = fetchedRows;
  if (clampedPage !== rawPage) {
    const { rows: refetchedRows } = await listKeys({ search: q, status, page: clampedPage, pageSize: PAGE_SIZE });
    rows = refetchedRows;
  }

  return (
    <div className="space-y-6">
      {/* 4 stat cards */}
      <StatCards stats={stats} />

      {/* Main content + right rail */}
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        {/* Left: keys table + recent usage */}
        <div className="space-y-6 min-w-0">
          <KeysTable
            rows={rows}
            total={total}
            page={clampedPage}
            q={q}
            status={status}
            pageSize={PAGE_SIZE}
          />
          <RecentUsage rows={usage} />
        </div>

        {/* Right rail: key details + API docs */}
        <div className="space-y-6">
          <KeyDetailsPanel rows={rows} />
        </div>
      </div>
    </div>
  );
}
