import { ImageResponse } from "next/og";

// No edge runtime: on edge this image is rendered per request, which is a
// cold start in front of every scraper that fetches it. On the default
// runtime Next bakes it into a static PNG at build time.
export const alt = "Federico Bellezza - Siti web e automazioni professionali";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Blob decorativi. Satori non implementa filter: blur, quindi la
            sfumatura sta nel gradiente: con il blur ignorato questi due
            restavano rettangoli a bordo netto sopra lo sfondo. */}
        <div
          style={{
            position: "absolute",
            top: -140,
            right: -140,
            width: 620,
            height: 620,
            background:
              "radial-gradient(circle, rgba(99, 102, 241, 0.45) 0%, rgba(99, 102, 241, 0) 65%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -180,
            left: 120,
            width: 520,
            height: 520,
            background:
              "radial-gradient(circle, rgba(59, 130, 246, 0.32) 0%, rgba(59, 130, 246, 0) 65%)",
          }}
        />

        {/* URL badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 100,
            padding: "8px 22px",
            marginBottom: 36,
          }}
        >
          <span style={{ color: "#94a3b8", fontSize: 20, fontFamily: "monospace" }}>
            federicobellezza.dev
          </span>
        </div>

        {/* Nome */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "white",
            lineHeight: 1.05,
            marginBottom: 20,
            letterSpacing: "-1px",
          }}
        >
          Federico Bellezza
        </div>

        {/* Tagline. Satori refuses a div with more than one child unless the
            display is spelled out, and this one holds text plus a span. */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0 10px",
            fontSize: 30,
            color: "#94a3b8",
            maxWidth: 720,
            lineHeight: 1.45,
            marginBottom: 52,
          }}
        >
          Siti web e automazioni che fanno{" "}
          <span style={{ color: "#818cf8", fontWeight: 600 }}>
            crescere il tuo business
          </span>
        </div>

        {/* Servizi pill */}
        <div style={{ display: "flex", gap: 14 }}>
          {["Siti Web", "E-Commerce", "Automazioni", "App Web"].map((s) => (
            <div
              key={s}
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 10,
                padding: "12px 24px",
                color: "#e2e8f0",
                fontSize: 20,
                fontWeight: 500,
              }}
            >
              {s}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
