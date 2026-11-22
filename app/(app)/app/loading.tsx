import { Skeleton } from "@/components/ui/misc";

/** Skeleton of the app pages (a header, a row of cards, a table), shown while the page's data loads. */
export default function AppLoading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}
