/** @type {import('next').NextConfig} */
const nextConfig = {
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
