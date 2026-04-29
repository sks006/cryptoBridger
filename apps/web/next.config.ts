const nextConfig: any = {
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
  allowedDevOrigins: ['192.168.0.189', 'crypto-bridger-web.loca.lt', 'nice-dingo-52.loca.lt', 'ordinary-ape-65.loca.lt'], 

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