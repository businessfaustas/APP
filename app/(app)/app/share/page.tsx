import { redirect } from "next/navigation";

import { pickSharedInput } from "@/lib/input/share";

/** PWA share target: puts the shared link (or VIN / text) into the analyze box. */
export default async function SharePage({ searchParams }: { searchParams: Promise<{ url?: string; text?: string; title?: string }> }) {
  const sp = await searchParams;
  const input = pickSharedInput(sp);
  redirect(input ? `/app?input=${encodeURIComponent(input)}` : "/app");
}
