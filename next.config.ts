import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module: load it from node_modules at runtime.
  serverExternalPackages: ["better-sqlite3"],
  // This app is its own root, even when it sits inside another repository.
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
