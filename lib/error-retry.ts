/**
 * Retry for error boundaries. A deterministic crash throws again when the boundary resets;
 * that must not escape the click handler, so it is reported and the page reloads instead.
 */
export function retryOrReload(
  reset: () => void,
  report: (error: unknown) => void,
  reload: () => void = () => window.location.reload(),
): void {
  try {
    reset();
  } catch (retryError) {
    report(retryError);
    reload();
  }
}
