import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

// Bumped when the cached URL shape changes so clients do not serve entries
// keyed against the old cross-origin API.
const CACHE_VERSION = process.env.NEXT_PUBLIC_CACHE_VERSION ?? "v3";
const SCHEDULE_CACHE_NAME = `amizone-schedule-cache-${CACHE_VERSION}`;
const API_CACHE_NAME = `amizone-api-cache-${CACHE_VERSION}`;

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    document: "/~offline",
  },
  workboxOptions: {
    runtimeCaching: [
      {
        // Schedule data changes day-to-day; prefer network and only fall back to cache.
        // Data now comes from this app's own tRPC router, so the pattern is same-origin.
        urlPattern: /\/api\/trpc\/amizone\.classSchedule/i,
        handler: "NetworkFirst",
        options: {
          cacheName: SCHEDULE_CACHE_NAME,
          expiration: {
            maxEntries: 30,
            maxAgeSeconds: 60 * 60 * 4, // 4 hours
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
          networkTimeoutSeconds: 8,
        },
      },
      {
        urlPattern: /\/api\/trpc\/amizone\./i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: API_CACHE_NAME,
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA(nextConfig);
