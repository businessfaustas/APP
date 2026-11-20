import { errorResponse, json, unauthorized } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { findDemoFixtureByVin } from "@/lib/demo/fixtures";
import { isCheckDigitValid, isVinFormat, normalizeVin } from "@/lib/input/vin";
import { cached, TTL } from "@/lib/pipeline/cache";
import { nhtsaDecode } from "@/lib/providers/vin/nhtsa";

export interface VinPreview {
  vin: string;
  /** Position 9 matches; false is normal for some non-US vehicles. */
  checkDigitOk: boolean;
  /** null when the VIN couldn't be decoded (unknown to NHTSA, or the service was unreachable). */
  car: {
    year: number | null;
    make: string;
    model: string;
    trim: string | null;
    engine: string | null;
    drive: string | null;
    body: string | null;
    fuel: string | null;
  } | null;
  reason: "unknown" | "unavailable" | null;
}

const PER_HOUR = 60;

/** Live VIN check for the analyze box: decodes the VIN so the car is shown before anything is charged. */
export async function GET(_req: Request, { params }: { params: Promise<{ vin: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const vin = normalizeVin((await params).vin);
  if (!isVinFormat(vin)) return errorResponse("A VIN has 17 letters and digits (no I, O or Q).", 400);

  const key = `vin:${user.id}`;
  const hits = await prisma.rateLimitHit.count({ where: { key, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } } });
  if (hits >= PER_HOUR) return errorResponse("Too many VIN checks. Try again later.", 429);
  await prisma.rateLimitHit.create({ data: { key } });

  const checkDigitOk = isCheckDigitValid(vin);
  const demo = findDemoFixtureByVin(vin);
  if (demo) {
    const v = demo.vehicle;
    return json<VinPreview>({
      vin,
      checkDigitOk,
      car: { year: v.year, make: v.make ?? "", model: v.model ?? "", trim: v.trim, engine: v.engine, drive: v.driveType, body: v.bodyClass, fuel: v.fuelType },
      reason: null,
    });
  }
  try {
    const d = await cached(`vinpreview:${vin}`, TTL.days(30), () => nhtsaDecode(vin));
    if (!d.make || !d.model) return json<VinPreview>({ vin, checkDigitOk, car: null, reason: "unknown" });
    return json<VinPreview>({
      vin,
      checkDigitOk,
      car: { year: d.year, make: d.make, model: d.model, trim: d.trim, engine: d.engine, drive: d.driveType, body: d.bodyClass, fuel: d.fuelType },
      reason: null,
    });
  } catch {
    return json<VinPreview>({ vin, checkDigitOk, car: null, reason: "unavailable" });
  }
}
