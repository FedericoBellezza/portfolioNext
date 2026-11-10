import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// iOS ignores SVG icons: without a PNG, "Aggiungi a Home" shows a screenshot
// of the page. Rendered once at build time from the same logo as the favicon.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const logoSvg = await readFile(
    path.join(process.cwd(), "public", "logo.svg"),
    "utf-8",
  );
  const logo = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#08090b",
        }}
      >
        {/* The logo's viewBox is 478.56 x 327.67. */}
        <img src={logo} width={120} height={82} />
      </div>
    ),
    { ...size },
  );
}
