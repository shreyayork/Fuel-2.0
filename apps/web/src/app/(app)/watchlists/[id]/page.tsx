import { WatchlistDetail } from "@/components/views/WatchlistDetail";
import { loadWatchlistDetailPageData } from "@/lib/watchlist-detail-page-data";

export const dynamic = "force-dynamic";

export default async function WatchlistDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { id } = await params;
  const { cohort: cohortParam } = await searchParams;
  const props = await loadWatchlistDetailPageData(id, cohortParam);

  return <WatchlistDetail {...props} routeContext="watchlist" />;
}
