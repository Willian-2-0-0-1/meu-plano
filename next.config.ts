import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.dicebear.com" },
    ],
  },
  outputFileTracingIncludes: {
    "/*": ["./prisma/dev.db"],
  },
};

export default nextConfig;
