import "server-only";

import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

export async function cacheGet<T>(key: string): Promise<T | null> {
  const row = await prisma.apiCache.findUnique({ where: { key } });
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.apiCache.delete({ where: { key } }).catch(() => undefined);
    return null;
  }
  return row.value as T;
}

export async function cacheSet(key: string, value: unknown, ttlMs: number): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlMs);
  const json = value as Prisma.InputJsonValue;
  await prisma.apiCache.upsert({ where: { key }, create: { key, value: json, expiresAt }, update: { value: json, expiresAt } });
}

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== null) return hit;
  const value = await fn();
  await cacheSet(key, value, ttlMs);
  return value;
}

export const TTL = {
  hours: (h: number) => h * 60 * 60 * 1000,
  days: (d: number) => d * 24 * 60 * 60 * 1000,
};
