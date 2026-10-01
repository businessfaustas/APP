import "server-only";

import { createHash } from "node:crypto";

import type { SessionUser } from "@/lib/auth/session";
import { chargeForAnalysis, checkRateLimit } from "@/lib/billing/credits";
import { prisma } from "@/lib/db/prisma";
import type { AuctionSource } from "@/lib/domain/schemas";
import type { Prisma } from "@/lib/generated/prisma/client";
import { parseInput } from "@/lib/input/parseInput";
import { detectAuctionUrl } from "@/lib/input/urls";
import { normalizeVin } from "@/lib/input/vin";
import { triggerAnalysis } from "@/lib/pipeline/trigger";
import { InputPayloadSchema, type InputPayload, type ManualListing } from "@/lib/pipeline/types";
import { loadSettings } from "@/lib/settings";

export class InputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InputError";
  }
}

export interface CreateAnalysisInput {
  input: string;
  mode?: "auto" | "MANUAL" | "EXTENSION";
  manual?: ManualListing | null;
  photos?: string[];
  extension?: InputPayload["extension"];
  batchId?: string | null;
  /** when the user pastes text, they can also give the URL it came from */
  url?: string | null;
}

function shortHash(s: string): string {
  return createHash("sha1").update(s).digest("hex").slice(0, 16);
}

/** Validates input, charges a credit, stores the analysis and starts the workflow. */
export async function createAnalysis(user: SessionUser, req: CreateAnalysisInput, opts: { skipRateLimit?: boolean } = {}): Promise<{ id: string }> {
  const photos = (req.photos ?? []).filter((p) => p.startsWith(`store:uploads/${user.id.replace(/[^\w-]/g, "")}/`));
  let parsedType: InputPayload["parsed"]["type"];
  let source: AuctionSource | null = null;
  let lotNumber: string | null = null;
  let url: string | null = req.url ?? null;
  let vin: string | null = null;
  let text: string | null = null;
  let inputValue: string;

  if (req.mode === "EXTENSION" && req.extension) {
    const d = detectAuctionUrl(req.extension.url);
    parsedType = "EXTENSION";
    source = d?.source ?? "OTHER";
    lotNumber = d?.lotNumber ?? null;
    url = req.extension.url;
    inputValue = lotNumber ? `${source}:${lotNumber}` : `ext:${shortHash(url)}`;
  } else if (req.mode === "MANUAL") {
    if (!req.manual) throw new InputError("Fill in the vehicle details.");
    parsedType = "MANUAL";
    source = "MANUAL";
    vin = req.manual.vin ? normalizeVin(req.manual.vin) : null;
    inputValue = `manual:${shortHash(JSON.stringify(req.manual))}`;
  } else {
    const p = parseInput(req.input);
    switch (p.type) {
      case "URL":
        parsedType = "URL";
        source = p.source;
        lotNumber = p.lotNumber;
        url = p.url;
        inputValue = lotNumber ? `${source}:${lotNumber}` : p.url;
        break;
      case "VIN":
        parsedType = "VIN";
        vin = p.vin;
        inputValue = p.vin;
        break;
      case "TEXT": {
        parsedType = "TEXT";
        text = p.text;
        vin = p.vin;
        const d = url ? detectAuctionUrl(url) : null;
        source = d?.source ?? null;
        lotNumber = d?.lotNumber ?? null;
        inputValue = `text:${shortHash(p.text)}`;
        break;
      }
      default:
        if (photos.length > 0 || req.manual) {
          parsedType = "MANUAL";
          source = "MANUAL";
          inputValue = `manual:${shortHash(JSON.stringify(req.manual ?? photos))}`;
          break;
        }
        throw new InputError(p.label);
    }
  }

  const payload: InputPayload = InputPayloadSchema.parse({
    parsed: { type: parsedType, source, lotNumber, url, vin },
    text,
    manual: req.manual ?? null,
    photos,
    extension: req.extension ?? null,
  });

  if (!opts.skipRateLimit) await checkRateLimit(user.id);
  const { snapshot } = await loadSettings(user.id);

  const analysis = await prisma.analysis.create({
    data: {
      userId: user.id,
      batchId: req.batchId ?? null,
      inputType: parsedType,
      inputValue,
      inputPayload: payload as unknown as Prisma.InputJsonValue,
      settingsSnapshot: snapshot as unknown as Prisma.InputJsonValue,
      status: "QUEUED",
      currentStep: "QUEUED",
    },
  });
  try {
    await chargeForAnalysis(user.id, analysis.id, inputValue);
  } catch (err) {
    await prisma.analysis.delete({ where: { id: analysis.id } });
    throw err;
  }
  await triggerAnalysis(analysis.id, user.id);
  return { id: analysis.id };
}

/** Continues an analysis that paused for listing details (pasted text / manual / photos). */
export async function resumeAnalysis(
  user: SessionUser,
  analysisId: string,
  add: { text?: string | null; manual?: ManualListing | null; photos?: string[] },
): Promise<void> {
  const a = await prisma.analysis.findFirst({ where: { id: analysisId, userId: user.id } });
  if (!a) throw new InputError("Analysis not found.");
  if (a.currentStep !== "NEEDS_INPUT") throw new InputError("This analysis isn't waiting for input.");
  const payload = InputPayloadSchema.parse(a.inputPayload);
  const photos = (add.photos ?? []).filter((p) => p.startsWith(`store:uploads/${user.id.replace(/[^\w-]/g, "")}/`));
  const next: InputPayload = {
    ...payload,
    parsed: { ...payload.parsed, type: add.text ? "TEXT" : payload.parsed.type === "URL" && !add.text ? "MANUAL" : payload.parsed.type },
    text: add.text?.trim() ? add.text.trim() : payload.text,
    manual: add.manual ? { ...(payload.manual ?? {}), ...add.manual } : payload.manual,
    photos: [...payload.photos, ...photos].slice(0, 40),
  };
  if (!next.text && !next.manual && next.photos.length === 0) throw new InputError("Paste the listing text or fill in the details.");
  await prisma.analysis.update({
    where: { id: analysisId },
    data: { inputPayload: next as unknown as Prisma.InputJsonValue, status: "QUEUED", currentStep: "QUEUED", error: null, progress: 5 },
  });
  await triggerAnalysis(analysisId, user.id);
}
