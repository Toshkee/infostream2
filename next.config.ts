import type { NextConfig } from "next";

// Everything the site loads at runtime is same-origin: fonts are self-hosted
// via next/font, images live in /public, and the only fetch is /api/chat.
// 'unsafe-inline' is required for Next's bootstrap <script> tags and the
// inline style attributes GSAP animates; 'unsafe-eval' is dev-only (HMR).
const csp = [
  "default-src 'self'",
  process.env.NODE_ENV === "development"
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // LAN development is served over plain HTTP. Upgrading requests here makes
  // browsers request /_next CSS and JS over HTTPS, where next dev has no TLS
  // listener, leaving the page as unstyled HTML. Production is HTTPS-only.
  ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // Two years; only meaningful once the site is served over HTTPS.
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },

  // Pin Turbopack's workspace root to THIS project directory. Without it, Next
  // walks up the filesystem looking for a lockfile and can latch onto the wrong
  // root when a stray package-lock.json exists in a parent folder — e.g. one
  // sitting directly in a collaborator's home dir (C:\Users\<name>\package-lock.json).
  // That produces the "inferred your workspace root, but it may not be correct"
  // warning and makes Turbopack resolve/watch from the wrong place. `__dirname`
  // is this config file's folder; Next transpiles next.config.ts to CommonJS, so
  // __dirname is always defined here.
  turbopack: {
    root: __dirname,
  },

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
