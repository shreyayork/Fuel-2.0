import "server-only";
import { postOverviewGeneration } from "@/lib/overview/post-generation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ uuid: string }> },
): Promise<Response> {
  return postOverviewGeneration(ctx, "generation_failed");
}
