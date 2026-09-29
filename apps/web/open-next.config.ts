import type { OpenNextConfig } from "@opennextjs/aws/types/open-next";

const config: OpenNextConfig = {
  default: {
    override: {
      wrapper: "aws-lambda-streaming",
      // We're not provisioning a DynamoDB tag table — without this override
      // revalidatePath would throw trying to hit a null table. "dummy"
      // no-ops tag revalidation, which is fine because every page is
      // `dynamic = "force-dynamic"` (no cross-instance cache to invalidate).
      tagCache: "dummy",
      queue: "dummy",
    },
  },
  buildCommand: "next build",
};

export default config;
