const LOADER_ID = "app-loader";
const HIDE_TIMEOUT_MS = 420;

/**
 * Hides and removes the startup loader overlay.
 * It resolves even if the transition event is not fired.
 */
export function hideStartupLoader(): Promise<void> {
  const body = document.body;
  const loader = document.getElementById(LOADER_ID);

  if (!loader) {
    body.classList.remove("app-loading");
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let cleaned = false;

    const cleanup = (): void => {
      if (cleaned) {
        return;
      }

      cleaned = true;
      loader.remove();
      body.classList.remove("app-loading");
      body.classList.add("app-ready");
      resolve();
    };

    const onTransitionEnd = (event: TransitionEvent): void => {
      if (event.target === loader && event.propertyName === "opacity") {
        loader.removeEventListener("transitionend", onTransitionEnd);
        cleanup();
      }
    };

    loader.addEventListener("transitionend", onTransitionEnd);

    requestAnimationFrame(() => {
      body.classList.add("app-ready");
    });

    window.setTimeout(() => {
      loader.removeEventListener("transitionend", onTransitionEnd);
      cleanup();
    }, HIDE_TIMEOUT_MS);
  });
}
