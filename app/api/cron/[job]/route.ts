import { errorResponse, json } from "@/lib/api";
import { env, features } from "@/lib/config/env";
import { runMaintenance, sendDueReminders } from "@/lib/jobs/maintenance";
import { captureError } from "@/lib/observability/errors";

export const runtime = "nodejs";

/**
 * External scheduler entry point (e.g. Vercel Cron) for deployments without Inngest.
 * Requires `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends it automatically when the
 * CRON_SECRET variable is set). When Inngest is connected it already runs these two jobs on its
 * own schedule, so this endpoint stands down instead of running them a second time; add
 * `?force=1` to run one by hand.
 */
export async function GET(req: Request, { params }: { params: Promise<{ job: string }> }) {
  const secret = env().CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return errorResponse("Unauthorized", 401);
  const { job } = await params;
  if (job !== "reminders" && job !== "maintenance") return errorResponse("Unknown job", 404);
  if (features.inngest() && new URL(req.url).searchParams.get("force") !== "1")
    return json({ skipped: "Inngest is connected and runs this job on its own schedule." });
  try {
    return json(job === "reminders" ? await sendDueReminders() : await runMaintenance());
  } catch (err) {
    await captureError(err, { source: "job", path: `/api/cron/${job}`, method: "GET" });
    return errorResponse("The job failed.", 500);
  }
}
