import type { KeyboardEvent as ReactKeyboardEvent } from "react";

/** WAI-ARIA tabs keyboard pattern — Arrow, Home, End */
export function handleTabListKeyDown(
  event: ReactKeyboardEvent<HTMLElement>,
  tabIds: string[],
  activeId: string,
  onSelect: (id: string) => void,
) {
  const index = tabIds.indexOf(activeId);
  if (index < 0) return;

  let nextIndex = index;

  switch (event.key) {
    case "ArrowRight":
    case "ArrowDown":
      nextIndex = (index + 1) % tabIds.length;
      break;
    case "ArrowLeft":
    case "ArrowUp":
      nextIndex = (index - 1 + tabIds.length) % tabIds.length;
      break;
    case "Home":
      nextIndex = 0;
      break;
    case "End":
      nextIndex = tabIds.length - 1;
      break;
    default:
      return;
  }

  event.preventDefault();
  onSelect(tabIds[nextIndex]);
  document.getElementById(`tab-${tabIds[nextIndex]}`)?.focus();
}
