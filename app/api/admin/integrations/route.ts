import { z } from "zod";

import { errorResponse, handleApiError, json } from "@/lib/api";
import { adminFromRequest } from "@/lib/auth/admin";
import { checkIntegration } from "@/lib/config/integrations";

export const runtime = "nodejs";

const Body = z.object({ key: z.string().min(1).max(32) });

/** Admin-only: makes one small read-only request with a saved key and reports whether it works. */
export async function POST(req: Request) {
  const admin = await adminFromRequest();
  if (!admin) return errorResponse("Admins only.", 403);
  try {
    const { key } = Body.parse(await req.json());
    return json(await checkIntegration(key));
  } catch (err) {
    return handleApiError(err);
  }
}
