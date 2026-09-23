import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // The CLI subprocess can lose captured `tsc --showConfig` output in some
    // container/sandbox runtimes. Keep production builds type-safe by using
    // Next's in-process TypeScript compiler API instead.
    useTypeScriptCli: false,
  },
};

export default nextConfig;
