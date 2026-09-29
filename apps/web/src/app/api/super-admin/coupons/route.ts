import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/auth/superadmin";
import { listCouponCampaigns } from "@/lib/credits/coupon-campaigns";
import { captureIntegrationException } from "@/lib/sentry/capture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function notFound(): NextResponse {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

/** Active/inactive campaigns for Users Admin coupon send picker. */
export async function GET(): Promise<Response> {
  const session = await getSession();
  const devEmail = process.env.COGNITO_USER_POOL_ID ? null : "mike@york.ie";
  if (!isSuperAdmin(session, devEmail)) return notFound();

  try {
    const rows = await listCouponCampaigns();
    const campaigns = rows
      .filter((r) => r.status === "active" || r.status === "inactive")
      .map((r) => ({
        id: r.id,
        name: r.name,
        audience: r.audience,
        status: r.status,
        globalPromotionCode: r.globalPromotionCode,
      }));
    return NextResponse.json({ campaigns });
  } catch (error) {
    captureIntegrationException(error, {
      integration: "postgres",
      operation: "superAdminListCoupons",
    });
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
