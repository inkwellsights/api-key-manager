import { listKeys } from "@/server/keys";
import { KeysTable } from "@/components/dashboard/KeysTable";
import type { KeyStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const PAGE_SIZE = 12;

export default async function KeysPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const q = typeof params.q === "string" ? params.q : "";
  const rawStatus = typeof params.status === "string" ? params.status : "all";
  const status = (["active", "disabled", "revoked", "all"].includes(rawStatus)
    ? rawStatus
    : "all") as KeyStatus | "all";
  const rawPage = Math.max(
    1,
    parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1
  );

  const { rows: fetchedRows, total } = await listKeys({
    search: q,
    status,
    page: rawPage,
    pageSize: PAGE_SIZE,
  });

  const clampedPage =
    total === 0
      ? 1
      : Math.min(rawPage, Math.max(1, Math.ceil(total / PAGE_SIZE)));

  let rows = fetchedRows;
  if (clampedPage !== rawPage) {
    const { rows: refetchedRows } = await listKeys({
      search: q,
      status,
      page: clampedPage,
      pageSize: PAGE_SIZE,
    });
    rows = refetchedRows;
  }

  return (
    <KeysTable
      rows={rows}
      total={total}
      page={clampedPage}
      q={q}
      status={status}
      pageSize={PAGE_SIZE}
    />
  );
}
