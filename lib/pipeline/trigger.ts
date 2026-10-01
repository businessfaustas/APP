import "server-only";

import { after } from "next/server";

import { features } from "@/lib/config/env";

import { inlineRunner, runAnalysis } from "./analysisRun";

/**
 * Starts the analysis workflow: on Inngest when configured (durable, retried), otherwise
 * in-process right after the response is sent (fine for local dev and small deployments).
 */
export async function triggerAnalysis(analysisId: string, userId: string): Promise<void> {
  if (features.inngest()) {
    const { inngest } = await import("./inngest");
    await inngest.send({ name: "analysis/requested", data: { analysisId, userId } });
    return;
  }
  after(async () => {
    await runAnalysis(analysisId, inlineRunner);
  });
}
