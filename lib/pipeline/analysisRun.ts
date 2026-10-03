import "server-only";

import { createHash } from "node:crypto";

import { llmEstimatePartPrices } from "@/lib/ai/prompts/estimates";
import { writeNarrative } from "@/lib/ai/prompts/narrative";
import { runVisionAudit } from "@/lib/ai/prompts/vision";
import { analysisAiCost } from "@/lib/ai/usage";
import { modelId } from "@/lib/ai/client";
import { refundAnalysis } from "@/lib/billing/credits";
import { assumptionsFromSettings, runAnalysisCalc } from "@/lib/calc/build";
import { env, features } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";
import { findDemoFixture } from "@/lib/demo/fixtures";
import type {
  DamageAssessment,
  DataSources,
  HistoryReport,
  LogisticsInfo,
  MarketValuation,
  NormalizedListing,
  PartSource,
  RepairEstimate,
  VehicleInfo,
} from "@/lib/domain/schemas";
import { NormalizedListingSchema } from "@/lib/domain/schemas";
import { normalizeTitle } from "@/lib/domain/titles";
import { heuristicDamage } from "@/lib/estimate/heuristicDamage";
import { buildRepairEstimate, type LaborRange, type PriceLookup } from "@/lib/estimate/repairEstimator";
import { templateNarrative } from "@/lib/flags/narrative";
import type { Prisma } from "@/lib/generated/prisma/client";
import { estimateDistance } from "@/lib/providers/geo/distance";
import { vinAuditHistory } from "@/lib/providers/history/vinaudit";
import { fetchListing } from "@/lib/providers/listing";
import { valueMarket } from "@/lib/providers/market";
import { NeedsInputError } from "@/lib/providers/types";
import { buildVehicleInfo, nhtsaComplaints, nhtsaDecode, nhtsaRecalls, type DecodedVin } from "@/lib/providers/vin/nhtsa";
import { loadExportProfile, loadFeeSchedules, type SettingsSnapshot } from "@/lib/settings";
import { loadPhotosForVision, storeListingPhotos } from "@/lib/storage/photos";
import { llmClassifyTitle } from "@/lib/ai/prompts/extractListing";

import { assemble } from "./assemble";
import { cached, TTL } from "./cache";
import { InputPayloadSchema } from "./types";

export interface StepRunner {
  run<T>(name: string, fn: () => Promise<T>): Promise<T>;
}

export const inlineRunner: StepRunner = { run: (_name, fn) => fn() };

const json = (v: unknown) => v as Prisma.InputJsonValue;

async function progress(id: string, step: string, pct: number): Promise<void> {
  await prisma.analysis.update({ where: { id }, data: { status: "RUNNING", currentStep: step, progress: pct } });
}

function vehicleLabel(l: NormalizedListing): string {
  return [l.year, l.make, l.model, l.trim].filter(Boolean).join(" ") || "Vehicle";
}

/**
 * The analysis workflow. Every step's output is JSON so it works both in-process and as
 * memoized Inngest steps. Optional steps degrade to fallbacks instead of failing.
 */
export async function runAnalysis(analysisId: string, step: StepRunner, now: Date = new Date()): Promise<void> {
  const a = await prisma.analysis.findUnique({ where: { id: analysisId } });
  if (!a || a.status === "COMPLETED" || a.status === "FAILED") return;

  try {
    const payload = InputPayloadSchema.parse(a.inputPayload);
    const snapshot = a.settingsSnapshot as unknown as SettingsSnapshot;
    const demoFixture = features.demoMode() ? findDemoFixture(payload.parsed.source, payload.parsed.lotNumber) : null;
    const sources: DataSources = {};

    // ── 1. Listing ──────────────────────────────────────────────────────────
    const fetched = await step.run("fetch-listing", async () => {
      await progress(analysisId, "fetch-listing", 10);
      // reuse a fresh cached listing for the same lot
      if (payload.parsed.lotNumber && payload.parsed.source && !payload.text && !payload.manual && !payload.extension && payload.photos.length === 0) {
        const existing = await prisma.listing.findUnique({
          where: { source_lotNumber: { source: payload.parsed.source, lotNumber: payload.parsed.lotNumber } },
        });
        const fresh = existing && now.getTime() - existing.fetchedAt.getTime() < TTL.hours(6);
        const parsedRaw = existing ? NormalizedListingSchema.safeParse(existing.rawData) : null;
        if (fresh && parsedRaw?.success && (!demoFixture || existing.extractionMethod === "FIXTURE")) {
          return {
            ok: true as const,
            listingId: existing.id,
            listing: parsedRaw.data,
            provider: "Cached listing",
            isDemo: existing.extractionMethod === "FIXTURE",
          };
        }
      }
      try {
        const res = await fetchListing(
          {
            type: payload.parsed.type,
            url: payload.parsed.url,
            source: payload.parsed.source,
            lotNumber: payload.parsed.lotNumber,
            vin: payload.parsed.vin,
            text: payload.text,
            manual: payload.manual,
            extension: payload.extension,
            uploadedPhotoUrls: payload.photos,
            analysisId,
          },
          now,
        );
        let listing = res.data;
        if (listing.titleRaw && listing.titleCategory === "UNKNOWN" && features.ai() && !normalizeTitle(listing.titleRaw)) {
          try {
            listing = { ...listing, titleCategory: await llmClassifyTitle(listing.titleRaw, analysisId) };
          } catch (err) {
            console.error("Title classification failed", err);
          }
        }
        if (listing.vin) {
          await prisma.vehicle.upsert({
            where: { vin: listing.vin },
            create: { vin: listing.vin, year: listing.year, make: listing.make, model: listing.model, trim: listing.trim },
            update: {},
          });
        }
        const data = {
          source: listing.source,
          sourceUrl: listing.sourceUrl,
          lotNumber: listing.lotNumber,
          vin: listing.vin,
          year: listing.year,
          make: listing.make,
          model: listing.model,
          trim: listing.trim,
          odometer: listing.odometer,
          odometerUnit: listing.odometerUnit,
          odometerBrand: listing.odometerBrand,
          titleCategory: listing.titleCategory,
          titleRaw: listing.titleRaw,
          titleState: listing.titleState,
          primaryDamage: listing.primaryDamage,
          secondaryDamage: listing.secondaryDamage,
          runCondition: listing.runCondition,
          hasKeys: listing.hasKeys,
          saleDate: listing.saleDate ? new Date(listing.saleDate) : null,
          saleStatus: listing.saleStatus,
          currentBid: listing.currentBid,
          buyNowPrice: listing.buyNowPrice,
          listedRetailValue: listing.listedRetailValue,
          yardName: listing.location.yardName,
          yardCity: listing.location.city,
          yardState: listing.location.state,
          yardZip: listing.location.zip,
          sellerType: listing.sellerType,
          extractionMethod: listing.extractionMethod,
          rawData: json(listing),
          fetchedAt: now,
        };
        const row =
          listing.lotNumber && listing.source !== "MANUAL"
            ? await prisma.listing.upsert({
                where: { source_lotNumber: { source: listing.source, lotNumber: listing.lotNumber } },
                create: data,
                update: data,
              })
            : await prisma.listing.create({ data });
        return { ok: true as const, listingId: row.id, listing, provider: res.provider, isDemo: res.isDemo };
      } catch (err) {
        if (err instanceof NeedsInputError) return { ok: false as const, message: err.message, prefill: err.prefill };
        throw err;
      }
    });

    if (!fetched.ok) {
      await prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: "RUNNING",
          currentStep: "NEEDS_INPUT",
          progress: 10,
          error: fetched.message,
          // Keep what the link told us so the form can prefill it.
          ...(fetched.prefill ? { inputPayload: json({ ...payload, hints: { ...fetched.prefill, ...(payload.hints ?? {}) } }) } : {}),
        },
      });
      return;
    }
    const { listingId, listing } = fetched;
    sources.listing = { provider: fetched.provider, isDemo: fetched.isDemo, ok: true, note: null };
    await prisma.analysis.update({ where: { id: analysisId }, data: { listingId, listingSnapshot: json(listing), error: null } });

    // ── 2. Photos + vehicle data (parallel) ─────────────────────────────────
    const [photoResult, vehicleResult] = await Promise.all([
      step.run("store-photos", async () => {
        await progress(analysisId, "store-photos", 20);
        try {
          return { ok: true, ...(await storeListingPhotos(listingId, listing.photoUrls, env().AI_MAX_PHOTOS)) };
        } catch (err) {
          console.error("Photo storage failed", err);
          return { ok: false, stored: 0, failed: listing.photoUrls.length };
        }
      }),
      step.run("decode-and-check", async () =>
        decodeAndCheck(listing, demoFixture ? { vehicle: demoFixture.vehicle, history: demoFixture.history } : null, now),
      ),
    ]);
    sources.photos = {
      provider: "Photo store",
      isDemo: Boolean(demoFixture),
      ok: photoResult.ok,
      note: `${photoResult.stored} stored${photoResult.failed ? `, ${photoResult.failed} failed` : ""}`,
    };
    sources.vehicle = vehicleResult.vehicleSource;
    sources.history = vehicleResult.historySource;
    const vehicle: VehicleInfo = vehicleResult.vehicle;
    const history: HistoryReport | null = vehicleResult.history;
    await prisma.analysis.update({ where: { id: analysisId }, data: { vehicleInfo: json(vehicle), history: json(history), progress: 30 } });

    // ── 3. Vision audit + market + logistics (parallel) ─────────────────────
    const exportProfile = snapshot.exitStrategy === "EXPORT" ? await loadExportProfile(snapshot.exportProfileId) : null;
    const [visionResult, marketResult] = await Promise.all([
      step.run("vision-audit", async () => {
        await progress(analysisId, "vision-audit", 40);
        if (demoFixture) return { damage: demoFixture.damage, fromPhotos: true, provider: "Demo fixture", isDemo: true, note: null as string | null };
        if (!features.ai()) {
          return {
            damage: heuristicDamage(listing, "AI isn't configured, so the photos weren't analyzed."),
            fromPhotos: false,
            provider: "Damage description",
            isDemo: false,
            note: "No AI key",
          };
        }
        const photos = await loadPhotosForVision(listingId, env().AI_MAX_PHOTOS);
        if (photos.length === 0) {
          return {
            damage: heuristicDamage(listing, "No photos were available."),
            fromPhotos: false,
            provider: "Damage description",
            isDemo: false,
            note: "No photos",
          };
        }
        try {
          const key = `vision:${modelId("vision")}:${createHash("sha256")
            .update(photos.map((p) => p.sha256).join(","))
            .digest("hex")}`;
          const damage = await cached(key, TTL.days(30), () => runVisionAudit({ listing, photos, analysisId }));
          return { damage, fromPhotos: true, provider: `AI vision (${modelId("vision")})`, isDemo: false, note: `${photos.length} photos` };
        } catch (err) {
          console.error("Vision audit failed", err);
          return {
            damage: heuristicDamage(listing, "The photo analysis failed."),
            fromPhotos: false,
            provider: "Damage description",
            isDemo: false,
            note: "Vision failed",
          };
        }
      }),
      step.run("market-valuation", async () => {
        await progress(analysisId, "market-valuation", 45);
        const market: MarketValuation = demoFixture
          ? demoFixture.market
          : await cached(
              `market:${[listing.make, listing.model, listing.year, listing.trim, snapshot.homeZip, Math.round((listing.odometer ?? 0) / 5000), snapshot.listToSaleBps].join(":")}`,
              TTL.hours(24),
              () =>
                valueMarket({
                  vin: listing.vin,
                  year: listing.year,
                  make: listing.make,
                  model: listing.model,
                  trim: listing.trim,
                  mileage: listing.odometer,
                  zip: snapshot.homeZip,
                  listToSaleBps: snapshot.listToSaleBps ?? 9600,
                  listedRetailValue: listing.listedRetailValue,
                  analysisId,
                }),
            );
        const dist = demoFixture
          ? { miles: demoFixture.distanceMiles, method: "FIXTURE" as const }
          : estimateDistance({ zip: listing.location.zip, city: listing.location.city, state: listing.location.state }, snapshot.homeZip);
        const milesToPort = exportProfile
          ? estimateDistance({ zip: listing.location.zip, city: listing.location.city, state: listing.location.state }, exportProfile.departurePortZip).miles
          : null;
        const logistics: LogisticsInfo = {
          distanceMiles: dist.miles,
          method: dist.method,
          yardZip: listing.location.zip,
          userZip: snapshot.homeZip,
          milesToPort,
        };
        return { market, logistics };
      }),
    ]);
    const damage: DamageAssessment = visionResult.damage;
    sources.vision = { provider: visionResult.provider, isDemo: visionResult.isDemo, ok: visionResult.fromPhotos, note: visionResult.note };
    sources.market = { provider: marketResult.market.provider, isDemo: marketResult.market.isDemo, ok: marketResult.market.provider !== "NONE", note: null };
    sources.logistics = { provider: marketResult.logistics.method, isDemo: Boolean(demoFixture), ok: marketResult.logistics.method !== "DEFAULT", note: null };
    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        damage: json(damage),
        damageFromPhotos: visionResult.fromPhotos,
        market: json(marketResult.market),
        logistics: json(marketResult.logistics),
        progress: 60,
      },
    });

    // ── 4. Repair estimate ──────────────────────────────────────────────────
    const repair: RepairEstimate = await step.run("repair-estimate", async () => {
      await progress(analysisId, "repair-estimate", 65);
      if (demoFixture) return demoFixture.repair;
      const lookup = await dbPriceLookup(vehicle.vehicleClass);
      return buildRepairEstimate({
        damage,
        vehicle,
        listing,
        lookup,
        aiPrices: features.ai() ? (parts) => llmEstimatePartPrices({ vehicle: vehicleLabel(listing), parts, analysisId }) : null,
      });
    });
    sources.repair = { provider: demoFixture ? "Demo fixture" : "Estimator (reference prices + rules)", isDemo: Boolean(demoFixture), ok: true, note: null };

    // ── 5. Flags + calculation ──────────────────────────────────────────────
    const calcOut = await step.run("calculate", async () => {
      await progress(analysisId, "calculate", 85);
      const feeSchedules = await loadFeeSchedules(listing.source);
      const assembled = assemble({
        listing,
        vehicle,
        history,
        damage,
        damageFromPhotos: visionResult.fromPhotos,
        repair,
        market: marketResult.market,
        logistics: marketResult.logistics,
        feeSchedules,
        buyerType: snapshot.buyerType,
        exportProfile,
        destinationResale: null,
        now,
      });
      const calc = runAnalysisCalc(assembled.base, assumptionsFromSettings(snapshot));
      await prisma.analysis.update({
        where: { id: analysisId },
        data: {
          repairEstimate: json(repair),
          calcInput: json(assembled.base),
          calc: json(calc),
          flags: json(assembled.flags),
          checklist: json(assembled.checklist),
          verdict: calc.verdict,
          maxBid: calc.maxBid,
          comfortBid: calc.comfortBid,
          breakEvenBid: calc.breakEvenBid,
          expectedProfit: calc.scenarios.expected.profitAtMaxBid,
          dealScore: calc.dealScore,
          progress: 90,
        },
      });
      return { calc, flags: assembled.flags, checklist: assembled.checklist };
    });

    // ── 6. Narrative ────────────────────────────────────────────────────────
    const narrative = await step.run("narrate", async () => {
      await progress(analysisId, "narrate", 95);
      const args = { calc: calcOut.calc, currentBid: listing.currentBid, flags: calcOut.flags, checklist: calcOut.checklist };
      if (demoFixture || !features.ai()) return { text: templateNarrative(args), source: "TEMPLATE" as const };
      return writeNarrative({ ...args, vehicle: vehicleLabel(listing), analysisId });
    });
    sources.narrative = { provider: narrative.source === "AI" ? "AI summary" : "Template", isDemo: Boolean(demoFixture), ok: true, note: null };

    // ── 7. Finalize ─────────────────────────────────────────────────────────
    await step.run("finalize", async () => {
      const cost = await analysisAiCost(analysisId);
      await prisma.analysis.update({
        where: { id: analysisId },
        data: {
          narrative: narrative.text,
          dataSources: json(sources),
          status: "COMPLETED",
          currentStep: "done",
          progress: 100,
          completedAt: new Date(),
          aiCostUsd: cost,
          aiModel: visionResult.fromPhotos && !demoFixture ? modelId("vision") : null,
        },
      });
      return true;
    });
  } catch (err) {
    console.error(`Analysis ${analysisId} failed`, err);
    await prisma.analysis.update({
      where: { id: analysisId },
      data: { status: "FAILED", error: err instanceof Error ? err.message.slice(0, 500) : "Unknown error", currentStep: "failed" },
    });
    await refundAnalysis(analysisId);
  }
}

async function decodeAndCheck(
  listing: NormalizedListing,
  demo: { vehicle: VehicleInfo; history: HistoryReport } | null,
  now: Date,
): Promise<{
  vehicle: VehicleInfo;
  history: HistoryReport | null;
  vehicleSource: DataSources[string];
  historySource: DataSources[string];
}> {
  if (demo) {
    return {
      vehicle: demo.vehicle,
      history: demo.history,
      vehicleSource: { provider: "Demo fixture", isDemo: true, ok: true, note: null },
      historySource: { provider: "Demo history", isDemo: true, ok: true, note: null },
    };
  }
  const vin = listing.vin;
  let decoded: DecodedVin | null = null;
  let decodeNote: string | null = null;
  const row = vin ? await prisma.vehicle.findUnique({ where: { vin } }) : null;
  if (vin) {
    if (row?.decoded && row.decodedAt) {
      decoded = row.decoded as unknown as DecodedVin;
    } else {
      try {
        decoded = await nhtsaDecode(vin);
        await prisma.vehicle.update({
          where: { vin },
          data: {
            decoded: json(decoded),
            decodedAt: now,
            year: decoded.year ?? undefined,
            make: decoded.make ?? undefined,
            model: decoded.model ?? undefined,
            trim: decoded.trim ?? undefined,
            bodyClass: decoded.bodyClass,
            driveType: decoded.driveType,
            engine: decoded.engine,
            fuelType: decoded.fuelType,
            transmission: decoded.transmission,
          },
        });
      } catch (err) {
        console.error("NHTSA decode failed", err);
        decodeNote = "NHTSA decode unavailable — using listing data";
      }
    }
  }

  const make = decoded?.make ?? listing.make;
  const model = decoded?.model ?? listing.model;
  const year = decoded?.year ?? listing.year;
  let recalls: VehicleInfo["recalls"] = [];
  let complaints: VehicleInfo["complaints"] = [];
  if (make && model && year) {
    const fresh = row?.checksFetchedAt && now.getTime() - row.checksFetchedAt.getTime() < TTL.days(7);
    if (fresh && row?.recalls) {
      recalls = row.recalls as VehicleInfo["recalls"];
      complaints = (row.complaintsSummary as VehicleInfo["complaints"]) ?? [];
    } else {
      try {
        [recalls, complaints] = await Promise.all([nhtsaRecalls(make, model, year), nhtsaComplaints(make, model, year)]);
        if (vin) await prisma.vehicle.update({ where: { vin }, data: { recalls: json(recalls), complaintsSummary: json(complaints), checksFetchedAt: now } });
      } catch (err) {
        console.error("NHTSA recalls/complaints failed", err);
      }
    }
  }
  const vehicle = buildVehicleInfo({
    vin,
    decoded,
    listing,
    recalls,
    complaints,
    decodeSource: decoded ? "NHTSA vPIC" : "Listing data",
  });
  if (vin) await prisma.vehicle.update({ where: { vin }, data: { vehicleClass: vehicle.vehicleClass } }).catch(() => undefined);

  let history: HistoryReport | null = null;
  let historyNote: string | null = null;
  if (vin && features.history()) {
    if (row?.history && row.historyFetchedAt && now.getTime() - row.historyFetchedAt.getTime() < TTL.days(30)) {
      history = row.history as unknown as HistoryReport;
    } else {
      try {
        history = await vinAuditHistory(vin);
        await prisma.vehicle.update({ where: { vin }, data: { history: json(history), historyProvider: history.provider, historyFetchedAt: now } });
      } catch (err) {
        console.error("History lookup failed", err);
        historyNote = "History provider unavailable";
      }
    }
  }
  return {
    vehicle,
    history,
    vehicleSource: { provider: vehicle.decodeSource, isDemo: false, ok: Boolean(decoded), note: decodeNote },
    historySource: { provider: history?.provider ?? "Not configured", isDemo: false, ok: Boolean(history), note: historyNote },
  };
}

async function dbPriceLookup(vehicleClass: string): Promise<PriceLookup> {
  const [prices, labor] = await Promise.all([prisma.partPriceReference.findMany({ where: { vehicleClass } }), prisma.laborReference.findMany()]);
  const priceMap = new Map(prices.map((p) => [`${p.partKey}:${p.source}`, { low: p.priceLow, high: p.priceHigh }]));
  const laborMap = new Map<string, LaborRange>(
    labor.map((l) => [
      l.partKey,
      {
        bodyLow: l.bodyHoursLow,
        bodyHigh: l.bodyHoursHigh,
        paintLow: l.paintHoursLow,
        paintHigh: l.paintHoursHigh,
        mechLow: l.mechHoursLow,
        mechHigh: l.mechHoursHigh,
      },
    ]),
  );
  return {
    reference: (partKey: string, source: PartSource) => priceMap.get(`${partKey}:${source}`) ?? null,
    labor: (partKey: string) => laborMap.get(partKey) ?? null,
  };
}
