import { InitiativesViewClient } from "@/components/views/InitiativesViewClient";
import { loadDataset } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function InitiativesPage() {
  const data = await loadDataset();
  return <InitiativesViewClient data={data} />;
}
