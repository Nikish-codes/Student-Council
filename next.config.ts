import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@libsql/client",
    "@libsql/core",
    "@libsql/hrana-client",
    "@libsql/isomorphic-fetch",
    "@libsql/isomorphic-ws",
    "libsql",
    "sharp",
    "drizzle-orm",
    "drizzle-kit",
  ],
  webpack: (config, { isServer, webpack }) => {
    if (isServer) {
      const externals = Array.isArray(config.externals)
        ? config.externals
        : config.externals
          ? [config.externals]
          : [];
      externals.push(
        (
          { request }: { request?: string },
          callback: (err?: unknown, result?: string) => void,
        ) => {
          if (request && /^@libsql\//.test(request)) {
            return callback(undefined, `commonjs ${request}`);
          }
          callback();
        },
      );
      config.externals = externals;
    }
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /(\.md$|[/\\]LICENSE$)/i,
      }),
      new webpack.ContextReplacementPlugin(
        /[/\\]node_modules[/\\]@libsql$/,
        /^\.[/\\][^/\\]+[/\\](?:index\.(?:js|cjs|mjs)|.*\.node|package\.json)$/,
      ),
    );
    return config;
  },
  async headers() {
    // CSP scoped to allow Razorpay checkout (script + iframe + API + telemetry),
    // self-hosted next/font, R2-hosted images, and inline scripts/styles that
    // Next.js + GSAP inject. No nonce pipeline yet, so 'unsafe-inline' is
    // required for scripts/styles; tighten with a nonce middleware later.
    //
    // frame-src also lists YouTube + Vimeo: both /events/[slug] and /clubs/[slug]
    // embed provider players. Without these the iframes are blocked outright and
    // the video section renders as an empty black box with a console violation.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      // media-src is needed because <video> falls back to default-src 'self'
      // otherwise, which blocks R2-hosted recap videos. https: keeps it
      // aligned with img-src (R2 + Cloudinary are both https).
      "media-src 'self' https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://lumberjack-cx.razorpay.com https://vitals.vercel-insights.com https://va.vercel-scripts.com",
      "frame-src https://api.razorpay.com https://checkout.razorpay.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests",
    ].join("; ");

    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
      { key: "Content-Security-Policy", value: csp },
    ];
    if (process.env.NODE_ENV === "production") {
      security.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }
    return [
      { source: "/:path*", headers: security },
      {
        // Edge-served club logos rarely change — cache them hard.
        source: "/club-logos/:file*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        // Pre-rendered srcset variants of the clubs composite — large + immutable.
        // (club-wall-{1600,2400,3200,4800,7850}.{webp,png}) Cache for a year.
        source: "/club-wall-:size(\\d+).:ext(webp|png)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1600, 1920, 2400],
    imageSizes: [64, 96, 128, 256, 384, 512],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: "https", hostname: "pub-88f0a7c5d200469fa7dbb8f90c605d45.r2.dev" },
      { protocol: "https", hostname: "*.r2.dev" },
      // Cloudinary — used for club gallery images pasted as raw URLs.
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "*.cloudinary.com" },
      // YouTube poster frames for the click-to-load video facades.
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
};

export default nextConfig;
