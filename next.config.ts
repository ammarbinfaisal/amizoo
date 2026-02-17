import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const CACHE_VERSION = process.env.NEXT_PUBLIC_CACHE_VERSION ?? "v2";
const SCHEDULE_CACHE_NAME = `amizone-schedule-cache-${CACHE_VERSION}`;
const API_CACHE_NAME = `amizone-api-cache-${CACHE_VERSION}`;

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    runtimeCaching: [
      {
        // Schedule data changes day-to-day; prefer network and only fall back to cache.
        urlPattern: /^https:\/\/api\.ami\.zoo\.fullstacktics\.com\/api\/v1\/class_schedule\/.*/i,
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
        urlPattern: /^https:\/\/api\.ami\.zoo\.fullstacktics\.com\/api\/.*/i,
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
