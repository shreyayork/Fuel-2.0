import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getActiveAccountForUser } from "@/lib/accounts";
import { getObservationProvenance } from "@/lib/provenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (process.env.COGNITO_USER_POOL_ID) {
    const session = await getSession();
    if (!session) redirect("/sign-in");
  }
  const email = (await getSession())?.email ?? "mike@york.ie";
  const account = await getActiveAccountForUser(email);
  if (!account) return NextResponse.json({ error: "no_account" }, { status: 400 });

  const { id } = await params;
  const bundle = await getObservationProvenance({
    accountId: account.id,
    observationId: id,
  });
  if (!bundle) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(bundle);
}
