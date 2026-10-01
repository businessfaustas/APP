import "server-only";

import { getSessionUser, type SessionUser } from "./session";

/** For API routes: the signed-in admin, or null. */
export async function adminFromRequest(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  return user?.role === "ADMIN" ? user : null;
}
