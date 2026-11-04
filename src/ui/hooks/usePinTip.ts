import { useCallback, useEffect, useState } from "react";

const DISMISSED_KEY = "altpadi:pin-tip-dismissed";

/** Shown only when Chrome says AltPadi is not on the toolbar and the user hasn't closed it. */
export function usePinTip(isPinned?: () => Promise<boolean>) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isPinned || readDismissed()) return;
    let live = true;
    isPinned().then((pinned) => live && setShow(!pinned), () => {});
    return () => {
      live = false;
    };
  }, [isPinned]);

  const dismiss = useCallback(() => {
    setShow(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Storage blocked: the tip just comes back next time.
    }
  }, []);

  return { show, dismiss };
}

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}
