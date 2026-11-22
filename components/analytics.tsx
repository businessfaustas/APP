"use client";

import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { useEffect } from "react";

import { reportClientError, reportVital, track } from "@/lib/analytics/client";

/**
 * Page views, Core Web Vitals and browser crash reports. Views and vitals are sent only after
 * the visitor allowed analytics; crash reports always are (they carry no personal data).
 */
export function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    track("page_view");
  }, [pathname]);

  useReportWebVitals((metric) => reportVital(metric));

  useEffect(() => {
    const onError = (e: ErrorEvent) => reportClientError(e.error ?? e.message);
    const onRejection = (e: PromiseRejectionEvent) => reportClientError(e.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
