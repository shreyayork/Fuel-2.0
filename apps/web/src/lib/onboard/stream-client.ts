"use client";

import type {
  OnboardErrorEvent,
  OnboardJobEvent,
  OnboardProfilePayload,
  OnboardStepEvent,
  OnboardStreamEvent,
} from "@/lib/onboard/profile-types";

export type { OnboardProfilePayload } from "@/lib/onboard/profile-types";

export type OnboardStreamError =
  | { kind: "blocked_provider" }
  | { kind: "already_has_account" }
  | { kind: "unknown"; message: string };

export type OnboardProfileStreamTarget = {
  companyId?: string;
  companyDomain?: string;
  backgroundEnrichment?: boolean;
};

export type FetchOnboardProfileStreamOptions = {
  signal?: AbortSignal;
};

export type OnboardStreamCallbacks = {
  onStep?: (event: OnboardStepEvent) => void;
  onProfile?: (
    payload: OnboardProfilePayload,
    meta?: { partial?: boolean; unlockReview?: boolean },
  ) => void;
  onJob?: (event: OnboardJobEvent) => void;
  onError?: (error: OnboardStreamError) => void;
};

function mapStreamError(event: OnboardErrorEvent): OnboardStreamError {
  if (event.code === "blocked_provider") return { kind: "blocked_provider" };
  if (event.code === "already_has_account") return { kind: "already_has_account" };
  return { kind: "unknown", message: event.message };
}

function handleStreamEvent(event: OnboardStreamEvent, callbacks: OnboardStreamCallbacks): boolean {
  if (event.type === "step") {
    callbacks.onStep?.(event);
    return true;
  }
  if (event.type === "profile") {
    callbacks.onProfile?.(event.payload, {
      partial: event.partial === true,
      unlockReview: event.unlockReview === true,
    });
    return true;
  }
  if (event.type === "job") {
    callbacks.onJob?.(event);
    return true;
  }
  if (event.type === "error") {
    callbacks.onError?.(mapStreamError(event));
    return false;
  }
  return true;
}

/** Parses NDJSON lines from the onboard profile stream API. */
export async function parseOnboardProfileStream(
  response: Response,
  callbacks: OnboardStreamCallbacks,
): Promise<OnboardProfilePayload | null> {
  if (!response.ok || !response.body) {
    callbacks.onError?.({ kind: "unknown", message: `stream failed: ${response.status}` });
    return null;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let payload: OnboardProfilePayload | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      try {
        const event = JSON.parse(line) as OnboardStreamEvent;
        const continueReading = handleStreamEvent(event, callbacks);
        if (event.type === "profile") payload = event.payload;
        if (!continueReading) return payload;
      } catch {
        // skip malformed line
      }
    }
  }

  return payload;
}

/** Enrichment target is resolved server-side; optional company params override email domain. */
export async function fetchOnboardProfileStream(
  callbacks: OnboardStreamCallbacks = {},
  target?: OnboardProfileStreamTarget,
  opts?: FetchOnboardProfileStreamOptions,
): Promise<{ payload: OnboardProfilePayload | null; error: OnboardStreamError | null }> {
  let streamError: OnboardStreamError | null = null;

  const params = new URLSearchParams();
  if (target?.companyId?.trim()) params.set("companyId", target.companyId.trim());
  if (target?.companyDomain?.trim()) {
    params.set("companyDomain", target.companyDomain.trim());
  }
  if (target?.backgroundEnrichment) params.set("background", "1");
  const qs = params.toString();
  const url = qs ? `/api/onboard/profile?${qs}` : "/api/onboard/profile";

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { accept: "application/x-ndjson" },
      signal: opts?.signal,
    });
  } catch (e) {
    if (opts?.signal?.aborted) {
      return { payload: null, error: null };
    }
    streamError = { kind: "unknown", message: (e as Error).message };
    callbacks.onError?.(streamError);
    return { payload: null, error: streamError };
  }

  const payload = await parseOnboardProfileStream(res, {
    ...callbacks,
    onError: (error) => {
      streamError = error;
      callbacks.onError?.(error);
    },
  });

  return { payload, error: streamError };
}

export type OnboardEnrichmentStatus = {
  runId: string;
  status: "pending" | "queued" | "running" | "completed" | "failed";
  steps: Record<string, string>;
  error: string | null;
  payload: OnboardProfilePayload | null;
};

export async function fetchOnboardEnrichmentStatus(
  runId: string,
  signal?: AbortSignal,
): Promise<OnboardEnrichmentStatus | null> {
  const response = await fetch(
    `/api/onboard/enrichment/${encodeURIComponent(runId)}`,
    { signal },
  );
  if (!response.ok) return null;
  return (await response.json()) as OnboardEnrichmentStatus;
}
