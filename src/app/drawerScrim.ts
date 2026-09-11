import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type SyntheticEvent } from "react";

/** Ignore scrim clicks for this long after a drawer opens (prevents open-click from closing). */
export const DRAWER_SCRIM_GUARD_MS = 400;

export function useDrawerOpenGuard(active: boolean) {
  const openedAtRef = useRef(0);
  useEffect(() => {
    if (active) openedAtRef.current = performance.now();
  }, [active]);
  return openedAtRef;
}

export function useScrimPointerClose(onClose: () => void, active = true) {
  const openedAtRef = useDrawerOpenGuard(active);
  return (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (performance.now() - openedAtRef.current < DRAWER_SCRIM_GUARD_MS) return;
    onClose();
  };
}

export function stopDrawerPanelPropagation(event: SyntheticEvent) {
  event.stopPropagation();
}

/** Block the opening pointer gesture from bubbling to the scrim. */
export function drawerPanelPointerProps() {
  return {
    onClick: stopDrawerPanelPropagation,
    onMouseDown: stopDrawerPanelPropagation,
    onPointerDown: stopDrawerPanelPropagation,
  } as const;
}
