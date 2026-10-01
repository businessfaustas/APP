import "server-only";

import { Inngest } from "inngest";

import { env } from "@/lib/config/env";
import { runMaintenance, sendDueReminders } from "@/lib/jobs/maintenance";

import { runAnalysis, type StepRunner } from "./analysisRun";

export const inngest = new Inngest({
  id: "auctionpulse-ai",
  eventKey: env().INNGEST_EVENT_KEY,
  isDev: env().INNGEST_DEV,
});

export const analysisRequested = inngest.createFunction(
  {
    id: "analysis-run",
    name: "Run analysis",
    triggers: [{ event: "analysis/requested" }],
    concurrency: [{ limit: 3, key: "event.data.userId" }, { limit: 20 }],
    retries: 2,
  },
  async ({ event, step }) => {
    const runner: StepRunner = {
      run: <T>(name: string, fn: () => Promise<T>) => step.run(name, fn) as unknown as Promise<T>,
    };
    await runAnalysis(String((event.data as { analysisId: string }).analysisId), runner);
    return { ok: true };
  },
);

export const remindersCron = inngest.createFunction(
  { id: "watchlist-reminders", name: "Watchlist reminders", triggers: [{ cron: "*/15 * * * *" }] },
  async ({ step }) => step.run("send-reminders", () => sendDueReminders()),
);

export const maintenanceCron = inngest.createFunction({ id: "maintenance", name: "Daily maintenance", triggers: [{ cron: "0 4 * * *" }] }, async ({ step }) =>
  step.run("maintenance", () => runMaintenance()),
);

export const inngestFunctions = [analysisRequested, remindersCron, maintenanceCron];
