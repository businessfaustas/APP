import { findDemoFixtureById } from "@/lib/demo/fixtures";
import { renderDemoPhoto } from "@/lib/demo/photoSvg";

/** Illustrative SVG "photos" for the demo lots (never real auction photos). */
export async function GET(_req: Request, { params }: { params: Promise<{ lot: string; n: string }> }) {
  const { lot, n } = await params;
  const fx = findDemoFixtureById(lot);
  const index = Number(n);
  const spec = fx?.photos[index - 1];
  if (!fx || !spec) return new Response("Not found", { status: 404 });
  return new Response(renderDemoPhoto(spec, index), {
    headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400" },
  });
}
