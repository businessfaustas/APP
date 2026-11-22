"use client";

import { WifiOffIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { useT } from "@/lib/i18n/client";

/** Tells people when the connection drops instead of letting forms spin forever. */
export function OfflineBanner() {
  const t = useT();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  if (!offline) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-stop-soft text-stop fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 px-4 py-2 text-center text-sm font-medium"
    >
      <WifiOffIcon className="size-4 shrink-0" aria-hidden="true" />
      {t("offline.banner")}
    </div>
  );
}
