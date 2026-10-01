import { getBatchRows } from "@/lib/analysis/batch";
import { json, notFound, unauthorized } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const data = await getBatchRows(id, user.id);
  if (!data) return notFound();
  return json(data, { headers: { "cache-control": "no-store" } });
}
