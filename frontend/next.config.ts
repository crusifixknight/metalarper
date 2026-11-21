import type { NextConfig } from "next";

const apiUrl = new URL(process.env.API_URL ?? "http://127.0.0.1:8000");

function isLocalHostname(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Django serves covers from MEDIA_URL; the domain comes from API_URL.
    remotePatterns: [
      {
        protocol: apiUrl.protocol === "https:" ? "https" : "http",
        hostname: apiUrl.hostname,
        port: apiUrl.port,
        pathname: "/media/**",
      },
    ],
    // In development the backend usually runs on localhost/127.0.0.1.
    dangerouslyAllowLocalIP: isLocalHostname(apiUrl.hostname),
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
