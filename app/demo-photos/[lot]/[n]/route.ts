import { bodyOf } from "@/lib/analysis/visual";
import { findDemoFixtureById } from "@/lib/demo/fixtures";
import { renderDemoPhoto } from "@/lib/demo/photoSvg";
import { paintOf } from "@/lib/vehicle/art";

/** Illustrative SVG "photos" for the demo lots (never real auction photos). */
export async function GET(_req: Request, { params }: { params: Promise<{ lot: string; n: string }> }) {
  const { lot, n } = await params;
  const fx = findDemoFixtureById(lot);
  const index = Number(n);
  const spec = fx?.photos[index - 1];
  if (!fx || !spec) return new Response("Not found", { status: 404 });
  const listing = fx.listing(new Date());
  return new Response(renderDemoPhoto(spec, index, { body: bodyOf(listing, fx.vehicle), paint: paintOf(listing.color) }), {
    headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=3600" },
  });
}
