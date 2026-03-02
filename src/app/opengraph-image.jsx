import { ImageResponse } from "next/og";

export const runtime = "edge";
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
        {/* Blob decorativo in alto a destra */}
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: "rgba(99, 102, 241, 0.2)",
            filter: "blur(80px)",
          }}
        />
        {/* Blob decorativo in basso a sinistra */}
        <div
          style={{
            position: "absolute",
            bottom: -60,
            left: 200,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "rgba(59, 130, 246, 0.15)",
            filter: "blur(60px)",
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

        {/* Tagline */}
        <div
          style={{
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
