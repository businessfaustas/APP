import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";

import { env, features } from "@/lib/config/env";
import { prisma } from "@/lib/db/prisma";
import { assertPublicUrl, fetchWithTimeout } from "@/lib/providers/http";

const MAX_BYTES = 15 * 1024 * 1024;
const MAX_EDGE = 1568;
// Without Supabase Storage photos go to local disk; on Vercel only the temp directory is writable.
const LOCAL_ROOT = process.env.VERCEL ? path.join(os.tmpdir(), "auctionpulse-photos") : path.join(process.cwd(), ".data", "photos");

let supabase: SupabaseClient | null = null;
function storageClient(): SupabaseClient | null {
  if (!features.supabaseStorage()) return null;
  if (!supabase) supabase = createClient(env().NEXT_PUBLIC_SUPABASE_URL!, env().SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  return supabase;
}

function safeLocalPath(storagePath: string): string {
  const full = path.resolve(LOCAL_ROOT, storagePath);
  if (!full.startsWith(LOCAL_ROOT + path.sep)) throw new Error("Invalid storage path");
  return full;
}

export async function putObject(storagePath: string, bytes: Uint8Array, contentType: string): Promise<void> {
  const sb = storageClient();
  if (sb) {
    const { error } = await sb.storage.from(env().SUPABASE_PHOTOS_BUCKET).upload(storagePath, bytes, { contentType, upsert: true });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    return;
  }
  const full = safeLocalPath(storagePath);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, bytes);
}

export async function getObject(storagePath: string): Promise<Uint8Array | null> {
  const sb = storageClient();
  if (sb) {
    const { data, error } = await sb.storage.from(env().SUPABASE_PHOTOS_BUCKET).download(storagePath);
    if (error || !data) return null;
    return new Uint8Array(await data.arrayBuffer());
  }
  try {
    return new Uint8Array(await readFile(safeLocalPath(storagePath)));
  } catch {
    return null;
  }
}

export async function removePrefix(prefix: string): Promise<void> {
  const sb = storageClient();
  if (sb) {
    const bucket = sb.storage.from(env().SUPABASE_PHOTOS_BUCKET);
    const { data } = await bucket.list(prefix, { limit: 1000 });
    if (data?.length) await bucket.remove(data.map((f) => `${prefix}/${f.name}`));
    return;
  }
  await rm(safeLocalPath(prefix), { recursive: true, force: true });
}

/** Resizes to ≤1568 px on the long edge (what vision models use) and re-encodes as JPEG. */
export async function normalizeImage(input: Uint8Array): Promise<{ bytes: Uint8Array; width: number; height: number; sha256: string }> {
  const img = sharp(input, { failOn: "error" }).rotate().resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true });
  const { data, info } = await img.jpeg({ quality: 80, mozjpeg: true }).toBuffer({ resolveWithObject: true });
  return { bytes: new Uint8Array(data), width: info.width, height: info.height, sha256: createHash("sha256").update(data).digest("hex") };
}

async function downloadImage(url: string): Promise<Uint8Array> {
  const target = await assertPublicUrl(url);
  let res = await fetchWithTimeout(target.toString(), {
    timeoutMs: 20000,
    headers: { "user-agent": "Mozilla/5.0 (compatible; AuctionPulseBot/1.0)", accept: "image/*" },
  });
  if (!res.ok && env().SCRAPINGBEE_API_KEY) {
    const api = new URL("https://app.scrapingbee.com/api/v1/");
    api.searchParams.set("api_key", env().SCRAPINGBEE_API_KEY!);
    api.searchParams.set("url", target.toString());
    api.searchParams.set("render_js", "false");
    res = await fetchWithTimeout(api.toString(), { timeoutMs: 30000 });
  }
  if (!res.ok) throw new Error(`Image HTTP ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  if (type && !type.startsWith("image/") && !type.includes("octet-stream")) throw new Error(`Not an image (${type})`);
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) throw new Error("Image too large");
  return buf;
}

export const UPLOAD_PREFIX = "store:";

/** Stores a user-uploaded image and returns a `store:` reference usable as a photo URL. */
export async function storeUpload(userId: string, bytes: Uint8Array): Promise<string> {
  if (bytes.byteLength > MAX_BYTES) throw new Error("Image too large (15 MB max)");
  const norm = await normalizeImage(bytes);
  const storagePath = `uploads/${userId.replace(/[^\w-]/g, "")}/${randomUUID()}.jpg`;
  await putObject(storagePath, norm.bytes, "image/jpeg");
  return `${UPLOAD_PREFIX}${storagePath}`;
}

/**
 * Downloads (or links) a listing's photos into ListingPhoto rows. Demo photos and uploads
 * are referenced in place; remote photos are resized and stored privately.
 */
export async function storeListingPhotos(listingId: string, urls: string[], max: number): Promise<{ stored: number; failed: number }> {
  const existing = await prisma.listingPhoto.count({ where: { listingId } });
  if (existing > 0) return { stored: existing, failed: 0 };
  let stored = 0;
  let failed = 0;
  const selected = urls.slice(0, max);
  for (let i = 0; i < selected.length; i++) {
    const url = selected[i]!;
    const position = i + 1;
    try {
      if (url.startsWith("/demo-photos/")) {
        await prisma.listingPhoto.create({ data: { listingId, position, originalUrl: url } });
      } else if (url.startsWith(UPLOAD_PREFIX)) {
        await prisma.listingPhoto.create({ data: { listingId, position, originalUrl: null, storagePath: url.slice(UPLOAD_PREFIX.length) } });
      } else {
        const raw = await downloadImage(url);
        const norm = await normalizeImage(raw);
        const storagePath = `listings/${listingId}/${position}.jpg`;
        await putObject(storagePath, norm.bytes, "image/jpeg");
        await prisma.listingPhoto.create({
          data: { listingId, position, originalUrl: url, storagePath, width: norm.width, height: norm.height, sha256: norm.sha256 },
        });
      }
      stored++;
    } catch (err) {
      failed++;
      console.error(`Photo ${position} failed`, err);
    }
  }
  return { stored, failed };
}

/** Loads stored photo bytes for the vision model. Demo SVGs are skipped (not real photos). */
export async function loadPhotosForVision(listingId: string, max: number): Promise<{ index: number; bytes: Uint8Array; mediaType: string; sha256: string }[]> {
  const photos = await prisma.listingPhoto.findMany({ where: { listingId, storagePath: { not: null } }, orderBy: { position: "asc" }, take: max });
  const out: { index: number; bytes: Uint8Array; mediaType: string; sha256: string }[] = [];
  for (const p of photos) {
    const bytes = await getObject(p.storagePath!);
    if (!bytes) continue;
    out.push({ index: out.length + 1, bytes, mediaType: "image/jpeg", sha256: p.sha256 ?? createHash("sha256").update(bytes).digest("hex") });
  }
  return out;
}
