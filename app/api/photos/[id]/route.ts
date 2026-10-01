import { notFound, unauthorized } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getObject } from "@/lib/storage/photos";

export const runtime = "nodejs";

/** Streams a stored listing photo to a user who owns an analysis of that listing. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const photo = await prisma.listingPhoto.findUnique({ where: { id } });
  if (!photo?.storagePath) return notFound();
  const owns = await prisma.analysis.findFirst({ where: { userId: user.id, listingId: photo.listingId }, select: { id: true } });
  const ownUpload = photo.storagePath.startsWith(`uploads/${user.id.replace(/[^\w-]/g, "")}/`);
  if (!owns && !ownUpload) return notFound();
  const bytes = await getObject(photo.storagePath);
  if (!bytes) return notFound();
  return new Response(new Uint8Array(bytes), {
    headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=3600", "x-content-type-options": "nosniff" },
  });
}
