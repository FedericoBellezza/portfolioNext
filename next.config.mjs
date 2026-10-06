/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse (pdfjs + canvas) and mammoth must stay as plain Node requires on the
  // server: bundling them breaks the PDF worker. Used by /api/assistant/ingest.
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas", "mammoth"],

  // Not in Next's default list, unlike lucide-react. Without this every client
  // component that imports from the "@phosphor-icons/react" barrel pulls the
  // whole icon set through the module graph, which is main-thread work the
  // above-the-fold nav and hero end up waiting behind.
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
  },

  async redirects() {
    return [
      {
        source: "/projects",
        destination: "/#progetti",
        permanent: true,
      },
      {
        source: "/contacts",
        destination: "/#contatti",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
