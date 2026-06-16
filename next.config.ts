import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // DEV-ONLY. Next's dev server blocks cross-origin requests to its internal
  // /_next/* assets and HMR websocket from any host other than localhost. When
  // the dev server is opened over the LAN (the "Network" URL, e.g. a phone or a
  // second machine on http://192.168.x.x:3000), those requests are rejected with
  // 403 — so the HTML loads but the client JS never hydrates: the page shows all
  // its content but every animation, the 3D layer and smooth scroll are dead.
  // Allowing the private-LAN ranges restores full behaviour over the network.
  // This has NO effect on production (`next start` / a deployed HTTPS site) —
  // the block lives only in the dev router-server.
  allowedDevOrigins: [
    "192.168.*.*", // home / office Wi-Fi LANs (covers 192.168.1.105, etc.)
    "10.*.*.*", // other private LANs
    "172.*.*.*", // other private LANs
    "127.0.0.1", // loopback (when used in place of localhost)
    "*.local", // Bonjour / mDNS hostnames (e.g. macbook.local)
  ],
};

export default nextConfig;
