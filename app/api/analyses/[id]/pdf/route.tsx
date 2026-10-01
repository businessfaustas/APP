import { renderToBuffer } from "@react-pdf/renderer";

import { applyAssumptionPatch } from "@/lib/analysis/overrides";
import { getAnalysisView } from "@/lib/analysis/view";
import { errorResponse, notFound, unauthorized } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { assumptionsFromSettings, runAnalysisCalc } from "@/lib/calc/build";
import { ReportPdf } from "@/lib/pdf/report";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const view = await getAnalysisView(id, { userId: user.id });
  if (!view) return notFound();
  if (view.status !== "COMPLETED" || !view.base || !view.listing) return errorResponse("The report isn't ready yet.", 409);
  const assumptions = applyAssumptionPatch(assumptionsFromSettings(view.settings), view.overrides.assumptions);
  const lineItems = view.overrides.lineItems ?? view.base.lineItems;
  const calc = runAnalysisCalc({ ...view.base, lineItems }, assumptions);
  const buffer = await renderToBuffer(<ReportPdf view={view} calc={calc} assumptions={assumptions} />);
  const name =
    [view.listing.year, view.listing.make, view.listing.model, view.listing.lotNumber]
      .filter(Boolean)
      .join("-")
      .replace(/[^\w-]+/g, "_") || "report";
  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${name}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
