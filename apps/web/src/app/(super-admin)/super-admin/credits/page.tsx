import {
  listActionCostsAdmin,
  listCreditPlansAdmin,
  listTopupPacksAdmin,
} from "@/lib/credits/admin";
import { CreditsAdminView } from "@/components/views/CreditsAdminView";

export const dynamic = "force-dynamic";

export default async function SuperAdminCreditsPage() {
  const [plans, actionCosts, topups] = await Promise.all([
    listCreditPlansAdmin(),
    listActionCostsAdmin(),
    listTopupPacksAdmin(),
  ]);
  return (
    <CreditsAdminView
      plans={plans}
      actionCosts={actionCosts}
      topups={topups}
    />
  );
}
