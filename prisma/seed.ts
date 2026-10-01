/**
 * Seeds reference data (placeholder fee schedules, labor + parts references, export
 * profiles) and the demo user. Idempotent: safe to run repeatedly.
 */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../lib/generated/prisma/client";
import { placeholderFeeSchedule } from "../lib/calc/placeholderFees";
import { VEHICLE_CLASSES, PART_SOURCES } from "../lib/domain/schemas";
import { LABOR_REFERENCE, placeholderPrice } from "../lib/estimate/referenceData";
import { DEMO_USER } from "../lib/config/demo";

const connectionString = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/auctionpulse";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function seedFeeSchedules() {
  for (const source of ["COPART", "IAAI"] as const) {
    for (const buyerType of ["LICENSED_DEALER", "PUBLIC_VIA_BROKER"] as const) {
      const s = placeholderFeeSchedule(source, buyerType);
      const existing = await prisma.feeSchedule.findFirst({ where: { source, buyerType } });
      if (existing) continue; // never overwrite an admin-edited schedule
      await prisma.feeSchedule.create({
        data: {
          source,
          buyerType,
          name: s.name,
          buyerFeeTiers: s.buyerFeeTiers as object[],
          onlineBidFeeTiers: s.onlineBidFeeTiers as object[],
          fixedFees: s.fixedFees,
          isPlaceholder: true,
          active: true,
        },
      });
    }
  }
}

async function seedReferences() {
  for (const ref of LABOR_REFERENCE) {
    await prisma.laborReference.upsert({
      where: { partKey: ref.partKey },
      update: {},
      create: {
        partKey: ref.partKey,
        displayName: ref.displayName,
        zone: ref.zone,
        category: ref.category,
        bodyHoursLow: ref.body[0],
        bodyHoursHigh: ref.body[1],
        paintHoursLow: ref.paint[0],
        paintHoursHigh: ref.paint[1],
        mechHoursLow: ref.mech[0],
        mechHoursHigh: ref.mech[1],
      },
    });
    const rows = [];
    for (const vehicleClass of VEHICLE_CLASSES) {
      for (const source of PART_SOURCES) {
        const price = placeholderPrice(ref, vehicleClass, source);
        if (!price) continue;
        rows.push({ partKey: ref.partKey, vehicleClass, source, priceLow: price.low, priceHigh: price.high, isPlaceholder: true });
      }
    }
    await prisma.partPriceReference.createMany({ data: rows, skipDuplicates: true });
  }
}

async function seedExportProfiles() {
  const profiles = [
    {
      name: "Lithuania via Klaipėda (container)",
      countryCode: "LT",
      currency: "EUR",
      departurePortZip: "07114",
      inlandToPortCentsPerMile: 100,
      portAndLoading: 350,
      oceanFreight: 1450,
      marineInsuranceBps: 150,
      destinationPortFees: 450,
      customsBrokerFee: 250,
      dutyBps: 1000,
      vatBps: 2100,
      registrationTax: 300,
      complianceConversion: 450,
      deliveryFromPort: 150,
    },
    {
      name: "Germany via Bremerhaven (container)",
      countryCode: "DE",
      currency: "EUR",
      departurePortZip: "07114",
      inlandToPortCentsPerMile: 100,
      portAndLoading: 350,
      oceanFreight: 1300,
      marineInsuranceBps: 150,
      destinationPortFees: 500,
      customsBrokerFee: 300,
      dutyBps: 1000,
      vatBps: 1900,
      registrationTax: 200,
      complianceConversion: 600,
      deliveryFromPort: 200,
    },
  ];
  for (const p of profiles) {
    const existing = await prisma.exportProfile.findFirst({ where: { name: p.name } });
    if (!existing) await prisma.exportProfile.create({ data: { ...p, isPlaceholder: true } });
  }
}

async function seedDemoUser() {
  await prisma.user.upsert({
    where: { id: DEMO_USER.id },
    update: {},
    create: {
      id: DEMO_USER.id,
      email: DEMO_USER.email,
      name: DEMO_USER.name,
      role: "ADMIN",
      plan: "PRO",
      creditsRemaining: 500,
      settings: { create: {} },
      ledger: { create: { delta: 500, reason: "SIGNUP" } },
    },
  });
}

async function main() {
  await seedFeeSchedules();
  await seedReferences();
  await seedExportProfiles();
  await seedDemoUser();
  const counts = {
    feeSchedules: await prisma.feeSchedule.count(),
    laborReferences: await prisma.laborReference.count(),
    partPrices: await prisma.partPriceReference.count(),
    exportProfiles: await prisma.exportProfile.count(),
    users: await prisma.user.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
