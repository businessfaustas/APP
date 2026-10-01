import { z } from "zod";

import { errorResponse, handleApiError, json } from "@/lib/api";
import { adminFromRequest } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/prisma";

const money = z.number().int().min(0).max(1_000_000);
const bps = z.number().int().min(0).max(10_000);

const Body = z.object({
  id: z.string().max(40).optional(),
  name: z.string().min(1).max(100),
  countryCode: z.string().length(2),
  currency: z.string().length(3),
  departurePortZip: z.string().regex(/^\d{5}$/),
  inlandToPortCentsPerMile: money,
  portAndLoading: money,
  oceanFreight: money,
  marineInsuranceBps: bps,
  destinationPortFees: money,
  customsBrokerFee: money,
  dutyBps: bps,
  vatBps: bps,
  vatRecoverableDefault: z.boolean(),
  registrationTax: money,
  complianceConversion: money,
  deliveryFromPort: money,
  isPlaceholder: z.boolean(),
});

export async function PUT(req: Request) {
  if (!(await adminFromRequest())) return errorResponse("Admins only.", 403);
  try {
    const { id, ...data } = Body.parse(await req.json());
    const row = id ? await prisma.exportProfile.update({ where: { id }, data }) : await prisma.exportProfile.create({ data });
    return json({ profile: row });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request) {
  if (!(await adminFromRequest())) return errorResponse("Admins only.", 403);
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    await prisma.userSettings.updateMany({ where: { exportProfileId: id }, data: { exportProfileId: null } });
    await prisma.exportProfile.delete({ where: { id } }).catch(() => undefined);
  }
  return json({ ok: true });
}
