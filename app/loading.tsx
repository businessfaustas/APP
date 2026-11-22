/** Shown instantly while a page streams in, so a slow connection sees progress instead of a blank screen. */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="grid min-h-[50dvh] place-items-center">
      <span className="border-primary/30 border-t-primary size-8 animate-spin rounded-full border-2" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
