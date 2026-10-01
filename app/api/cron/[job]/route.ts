import { errorResponse, json } from "@/lib/api";
import { env } from "@/lib/config/env";
import { runMaintenance, sendDueReminders } from "@/lib/jobs/maintenance";

export const runtime = "nodejs";

/**
 * External scheduler entry point (e.g. Vercel Cron) for deployments without Inngest.
 * Requires `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: Request, { params }: { params: Promise<{ job: string }> }) {
  const secret = env().CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return errorResponse("Unauthorized", 401);
  const { job } = await params;
  if (job === "reminders") return json(await sendDueReminders());
  if (job === "maintenance") return json(await runMaintenance());
  return errorResponse("Unknown job", 404);
}
