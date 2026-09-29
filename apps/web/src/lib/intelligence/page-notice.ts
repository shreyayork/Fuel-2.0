export type PageNoticeState = {
  page: string | null;
  pending: string | null;
};

export const EMPTY_PAGE_NOTICE: PageNoticeState = { page: null, pending: null };

/** Queue or show a page notice; hide when message is null. */
export function applyPageNoticeUpdate(
  current: PageNoticeState,
  message: string | null,
  drawerBlocksNotice: boolean,
): PageNoticeState {
  if (message === null) {
    return EMPTY_PAGE_NOTICE;
  }
  if (drawerBlocksNotice) {
    return { ...current, pending: message };
  }
  return { page: message, pending: null };
}

/** Promote a queued notice once the drawer no longer blocks the page banner. */
export function flushPendingPageNotice(
  current: PageNoticeState,
  drawerBlocksNotice: boolean,
): PageNoticeState {
  if (drawerBlocksNotice || !current.pending) return current;
  return { page: current.pending, pending: null };
}
