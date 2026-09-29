import { NextResponse, type NextRequest } from "next/server";
import { neptuneQuery } from "@/lib/fuel-data";
import { getSession } from "@/lib/auth/session";
import { captureFuelDataException } from "@/lib/sentry/capture";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ uuid: string }> }) {
  if (process.env.COGNITO_USER_POOL_ID) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { uuid } = await ctx.params;
  if (!/^[a-zA-Z0-9_\-]{1,100}$/.test(uuid)) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }
  try {
    const [exists, edgeLabels, inEdgeLabels, articleCount, valueMap] = await Promise.all([
      neptuneQuery(`g.V('${uuid}').count()`),
      neptuneQuery(`g.V('${uuid}').outE().label().dedup().toList()`),
      neptuneQuery(`g.V('${uuid}').inE().label().dedup().toList()`),
      neptuneQuery(`g.V('${uuid}').out('has_article').count()`),
      neptuneQuery(`g.V('${uuid}').valueMap(true)`),
    ]);
    return NextResponse.json({ exists, outEdges: edgeLabels, inEdges: inEdgeLabels, articleCount, valueMap });
  } catch (e) {
    captureFuelDataException(e, "neptune_probe");
    console.error("neptune-probe failed", e);
    return NextResponse.json({ error: String((e as Error).message) }, { status: 502 });
  }
}
