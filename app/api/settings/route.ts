import { randomBytes } from "node:crypto";

import { z } from "zod";

import { handleApiError, json, unauthorized } from "@/lib/api";
import { getSessionUser, hashToken } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { BuyerTypeSchema, ExitStrategySchema, PartSourceSchema } from "@/lib/domain/schemas";

const money = z.number().int().min(0).max(1_000_000);
const bps = z.number().int().min(0).max(100_000);

const SettingsPatch = z
  .object({
    homeZip: z.string().regex(/^\d{5}$/, "Enter a 5-digit US ZIP"),
    currency: z.enum(["USD", "EUR", "GBP", "PLN", "CAD"]),
    buyerType: BuyerTypeSchema,
    laborRate: money,
    paintMaterialsPerHour: money,
    partsSourcePreference: PartSourceSchema,
    partsDiscountBps: bps,
    rebuiltFactorBps: bps,
    listToSaleBps: bps,
    targetProfitBps: bps,
    targetProfitMin: money,
    transportCentsPerMile: money,
    transportMin: money,
    titleRegInspection: money,
    storageDays: z.number().int().min(0).max(365),
    storagePerDay: money,
    holdingCostPerDay: money,
    holdingDaysExpected: z.number().int().min(0).max(365),
    sellingCostBps: bps,
    sellingCostFixed: money,
    salesTaxBps: bps,
    brokerFee: money,
    contingencyOverrideBps: bps.nullable(),
    exitStrategy: ExitStrategySchema,
    exportProfileId: z.string().max(40).nullable(),
    vatRecoverable: z.boolean(),
  })
  .partial();

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const settings = await prisma.userSettings.findUnique({ where: { userId: user.id } });
  return json({ settings });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  try {
    const patch = SettingsPatch.parse(await req.json());
    if (patch.exportProfileId) {
      const exists = await prisma.exportProfile.findUnique({ where: { id: patch.exportProfileId }, select: { id: true } });
      if (!exists) patch.exportProfileId = null;
    }
    const settings = await prisma.userSettings.upsert({ where: { userId: user.id }, create: { userId: user.id, ...patch }, update: patch });
    return json({ settings });
  } catch (err) {
    return handleApiError(err);
  }
}

/** Creates (or rotates) the browser-extension API token. The plain token is shown once. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { action } = (await req.json().catch(() => ({}))) as { action?: string };
  if (action === "revoke-token") {
    await prisma.user.update({ where: { id: user.id }, data: { apiTokenHash: null } });
    return json({ ok: true });
  }
  const token = `ap_${randomBytes(24).toString("base64url")}`;
  await prisma.user.update({ where: { id: user.id }, data: { apiTokenHash: hashToken(token) } });
  return json({ token });
}
