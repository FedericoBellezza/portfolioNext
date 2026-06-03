/** @type {import('next').NextConfig} */
const nextConfig = {
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
