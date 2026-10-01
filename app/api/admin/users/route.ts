import { z } from "zod";

import { errorResponse, handleApiError, json } from "@/lib/api";
import { adminFromRequest } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/prisma";

const Body = z.object({
  id: z.string().min(1).max(64),
  plan: z.enum(["FREE", "PRO", "BUSINESS"]).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  creditsDelta: z.number().int().min(-10000).max(10000).optional(),
});

export async function PATCH(req: Request) {
  const admin = await adminFromRequest();
  if (!admin) return errorResponse("Admins only.", 403);
  try {
    const b = Body.parse(await req.json());
    if (b.id === admin.id && b.role === "USER") return errorResponse("You can't remove your own admin role.", 400);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: b.id },
        data: {
          plan: b.plan,
          role: b.role,
          ...(b.creditsDelta ? { creditsRemaining: { increment: b.creditsDelta } } : {}),
        },
      }),
      ...(b.creditsDelta ? [prisma.creditLedger.create({ data: { userId: b.id, delta: b.creditsDelta, reason: "ADMIN" } })] : []),
    ]);
    return json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
