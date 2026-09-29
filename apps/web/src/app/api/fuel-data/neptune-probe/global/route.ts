import { NextResponse } from "next/server";
import { neptuneQuery } from "@/lib/fuel-data";
import { getSession } from "@/lib/auth/session";
import { captureFuelDataException } from "@/lib/sentry/capture";

export async function GET() {
  if (process.env.COGNITO_USER_POOL_ID) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const [articleCount, edgeLabels, sampleArticleEdges, sampleArticleVertex] = await Promise.all([
      neptuneQuery(`g.V().hasLabel('article').count()`),
      neptuneQuery(`g.E().label().dedup().toList()`),
      neptuneQuery(`g.E().hasLabel('has_article').sample(3).outV().values('name').toList()`),
      neptuneQuery(`g.V().hasLabel('article').limit(1).valueMap(true)`),
    ]);
    return NextResponse.json({ articleCount, edgeLabels, sampleArticleEdges, sampleArticleVertex });
  } catch (e) {
    captureFuelDataException(e, "neptune_probe_global");
    return NextResponse.json({ error: String((e as Error).message) }, { status: 502 });
  }
}
