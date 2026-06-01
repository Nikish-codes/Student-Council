import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@libsql/client",
    "@libsql/core",
    "@libsql/hrana-client",
    "@libsql/isomorphic-fetch",
    "@libsql/isomorphic-ws",
    "@payloadcms/db-sqlite",
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
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
    ];
    if (process.env.NODE_ENV === "production") {
      security.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }
    return [{ source: "/:path*", headers: security }];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1600, 1920, 2400],
    imageSizes: [64, 96, 128, 256, 384, 512],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: "https", hostname: "pub-88f0a7c5d200469fa7dbb8f90c605d45.r2.dev" },
      { protocol: "https", hostname: "*.r2.dev" },
    ],
  },
};

export default withPayload(nextConfig);
