import { useEffect, useRef } from 'react';

/**
 * The mobile app has no router/query cache, so screens mount once and stay
 * mounted in the custom navigator. This hook re-runs a loader every time the
 * screen becomes the active one — the equivalent of React Query's
 * `refetchOnMount` on the website, which is why the web app always felt
 * fresh while the mobile screens showed stale data.
 */
export function useFocusRefresh(loader: () => void | Promise<void>, isActive: boolean = true) {
  const wasActive = useRef(false);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    if (isActive && !wasActive.current) {
      wasActive.current = true;
      void loaderRef.current();
    }
    if (!isActive) {
      wasActive.current = false;
    }
  }, [isActive]);
}
