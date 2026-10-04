import type { NextConfig } from "next";

// The dev server is normally reached through the ngrok tunnel configured in
// NEXTAUTH_URL. Next.js blocks cross-origin access to its own dev resources
// (notably the /_next/webpack-hmr websocket) unless the origin is allowlisted,
// and a blocked HMR connection stops the browser client from booting, which
// leaves the app's initial server-rendered loading state on screen forever.
// The tunnel host is derived from NEXTAUTH_URL so there is a single source of
// truth for it. This only affects `next dev`; production is unaffected.
function devTunnelHost(): string | null {
  const url = process.env.NEXTAUTH_URL;
  if (!url) return null;
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}

const tunnelHost = devTunnelHost();

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: tunnelHost ? [tunnelHost] : [],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
