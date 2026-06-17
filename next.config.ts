import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_AUTH_DISABLED: process.env.NEXT_PUBLIC_AUTH_DISABLED,
    FBOS_AUTH_DISABLED: process.env.FBOS_AUTH_DISABLED,
  },
};

export default nextConfig;
