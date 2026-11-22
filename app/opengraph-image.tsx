import { ImageResponse } from "next/og";

import { LOGO_ASPECT, LOGO_VIEWBOX, LOGO_WORDMARK } from "@/components/brand-art";

export const alt = "FlagBid: know your max bid before you bid";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The card shown when a link is shared on social networks, chat apps and search results. */
export default function OpenGraphImage() {
  const logoWidth = 560;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 90px",
        color: "#ecfdf5",
        background: "radial-gradient(circle at 90% 105%, #2f8f66 0%, #123a27 45%, #0a1f14 100%)",
      }}
    >
      <svg width={logoWidth} height={Math.round(logoWidth / LOGO_ASPECT)} viewBox={LOGO_VIEWBOX} xmlns="http://www.w3.org/2000/svg">
        <path d={LOGO_WORDMARK} fill="#7fedbd" fillRule="evenodd" />
      </svg>
      <div style={{ fontSize: 64, fontWeight: 700, marginTop: 44, lineHeight: 1.1, letterSpacing: -1.5 }}>Know your max bid before you bid.</div>
      <div style={{ fontSize: 30, marginTop: 26, color: "#a7d8c0" }}>Salvage auction analysis: repairs, resale value and profit in a minute.</div>
    </div>,
    { ...size },
  );
}
