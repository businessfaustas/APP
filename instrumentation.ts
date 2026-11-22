import type { Instrumentation } from "next";

/**
 * Runs once per server instance. Next calls onRequestError for every uncaught server error
 * (pages, route handlers, server actions), which is how crashes reach the error table, Sentry
 * and the alert webhook without each route having to remember to report them.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { log } = await import("@/lib/observability/log");
  log.info("server.started", {
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7),
    maintenance: process.env.MAINTENANCE_MODE === "true",
  });
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { captureError } = await import("@/lib/observability/errors");
  await captureError(err, {
    source: "server",
    path: request.path.split("?")[0],
    method: request.method,
    extra: { route: context.routePath, routeType: context.routeType },
  });
};
