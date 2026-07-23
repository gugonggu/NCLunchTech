import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Review photos permit files up to 5 MB. Leave room for multipart form fields.
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
