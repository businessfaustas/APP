import { json } from "@/lib/api";
import { appUrl, databaseUrl } from "@/lib/config/deployment";
import { features } from "@/lib/config/env";
import { explainDatabaseError } from "@/lib/db/errors";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/** Setup status for whoever deploys the app: what's connected and what's missing. No secrets. */
export async function GET() {
  const status = {
    appUrl: appUrl(),
    demoSignIn: features.demoMode(),
    supabaseSignIn: features.supabaseAuth(),
    databaseConnected: Boolean(databaseUrl()),
    databaseReachable: false,
    databaseSetUp: false,
    problem: null as string | null,
  };
  if (status.databaseConnected) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      status.databaseReachable = true;
      status.databaseSetUp = (await prisma.feeSchedule.count()) > 0;
      if (!status.databaseSetUp) status.problem = "the database is empty. Redeploy the project so the build can set it up.";
    } catch (err) {
      status.problem = explainDatabaseError(err);
    }
  } else {
    status.problem = explainDatabaseError(null);
  }
  if (!status.problem && !status.demoSignIn && !status.supabaseSignIn) {
    status.problem = "no way to sign in: set DEMO_MODE=true, or configure Supabase login, then redeploy.";
  }
  return json({ ok: status.problem === null, ...status }, { headers: { "cache-control": "no-store" } });
}
