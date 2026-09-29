import { NextResponse, type NextRequest } from "next/server";
import { getCompany } from "@/lib/fuel-data";
import { getSession } from "@/lib/auth/session";
import { captureFuelDataException } from "@/lib/sentry/capture";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ uuid: string }> }) {
  if (process.env.COGNITO_USER_POOL_ID) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { uuid } = await ctx.params;
  try {
    const company = await getCompany(uuid);
    if (!company) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ company });
  } catch (e) {
    captureFuelDataException(e, "get_company");
    console.error("fuel-data getCompany failed", e);
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
}
