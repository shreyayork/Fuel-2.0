/** Client helper: poll document-driven initiative generation to completion. */
export type DocumentInitiativeStatus =
  | "none"
  | "pending"
  | "running"
  | "complete"
  | "failed";

export async function waitForDocumentInitiativesIdle(
  companyUuid: string,
  opts?: { intervalMs?: number; timeoutMs?: number },
): Promise<DocumentInitiativeStatus> {
  const intervalMs = opts?.intervalMs ?? 3000;
  const timeoutMs = opts?.timeoutMs ?? 120_000;
  const started = Date.now();
  let last: DocumentInitiativeStatus = "pending";
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(
        `/api/company/${companyUuid}/initiatives/generation-status`,
        { cache: "no-store" },
      );
      if (res.ok) {
        const json = (await res.json()) as { status?: DocumentInitiativeStatus };
        last = json.status ?? last;
        if (last !== "pending" && last !== "running") return last;
      }
    } catch {
      // keep polling through transient errors
    }
    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
  }
  return last;
}
