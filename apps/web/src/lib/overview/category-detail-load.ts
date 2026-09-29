/**
 * Category track detail loads glance category first, then a heavier payload
 * (initiatives, intelligence, playbooks). While that second fetch is in flight,
 * initiatives should show a skeleton — not an empty list.
 */
export function isCategoryDetailPayloadLoading(opts: {
  detail: unknown | null;
  loadError: string | null;
}): boolean {
  return opts.detail == null && opts.loadError == null;
}
