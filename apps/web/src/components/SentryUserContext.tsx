"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

type Props = {
  userId: string;
  email?: string;
};

/** Sets Sentry user context from the authenticated Cognito session. */
export function SentryUserContext({ userId, email }: Props) {
  useEffect(() => {
    Sentry.setUser({ id: userId, email });
    return () => {
      Sentry.setUser(null);
    };
  }, [userId, email]);

  return null;
}
