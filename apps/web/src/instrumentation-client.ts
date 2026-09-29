import * as Sentry from "@sentry/nextjs";
import { getClientSentryOptions } from "@/lib/sentry/options";

Sentry.init({
  ...getClientSentryOptions(),
  integrations: [Sentry.replayIntegration()],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
