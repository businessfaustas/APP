"use client";

import { ErrorView } from "@/components/error-view";

/** Errors inside the signed-in app render inside the app shell, so navigation stays usable. */
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorView error={error} retry={retry} scope="app" />;
}
