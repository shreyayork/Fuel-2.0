import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    el => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true",
  );
}

/** Focus trap, Escape to close, and restore focus — WCAG 2.4.3 / 2.1.1 */
export function useDialogA11y(
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open || !containerRef.current) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const container = containerRef.current;

    const focusInitial = () => {
      const preferred = container.querySelector<HTMLElement>("[data-autofocus]");
      const focusable = getFocusable(container);
      (preferred ?? focusable[0])?.focus();
    };

    window.requestAnimationFrame(focusInitial);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !containerRef.current) return;

      const focusable = getFocusable(containerRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [open, onClose, containerRef]);
}
