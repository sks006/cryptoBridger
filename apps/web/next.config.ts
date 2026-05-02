import path from "path";

const nextConfig: any = {
  // ─── Turbopack Fix ────────────────────────────────────────────────────────
  turbopack: {
    // Note: Setting root to monorepo root (../../) was causing 100% CPU usage
    // as it triggered Tailwind v4 to scan the entire monorepo.
    // Removed to keep compilation focused on the web app only.
    // root: path.resolve(__dirname, "../../"),
  },


  // ─── Security headers ───────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Permissions-Policy",
            value: "nfc=*",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },

  // ─── Development helper ─────────────────────────────────────────────────────
  // Allows HMR and dev resources to work over the local network IP or tunnel
  allowedDevOrigins: [
    '192.168.0.189', 
    'crypto-bridger-web.loca.lt',
  ], 

  // ─── Env vars exposed to the browser ────────────────────────────────────────
  env: {
    // IMPORTANT: Replace these with YOUR actual tunnel URLs from the terminal
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://crypto-bridger-api.loca.lt",
  },

  // ─── External packages ──────────────────────────────────────────────────────
  // Prevents Turbopack from trying to bundle native modules like lightningcss
  serverExternalPackages: ['lightningcss'],
};

export default nextConfig;