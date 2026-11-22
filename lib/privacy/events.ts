/** The only analytics events the app records. A fixed list keeps arbitrary data out of the table. */
export const ANALYTICS_EVENTS = [
  "page_view",
  "analysis_started",
  "analysis_completed",
  "demo_started",
  "signup_started",
  "checkout_started",
  "pricing_viewed",
  "share_created",
  "extension_clicked",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];
