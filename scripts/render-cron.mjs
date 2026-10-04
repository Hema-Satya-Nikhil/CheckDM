#!/usr/bin/env node

const route = process.argv[2];
const allowedRoutes = new Set([
  "refresh-tokens",
  "attach-next-reel",
  "snapshot-followers",
]);

if (!allowedRoutes.has(route)) {
  console.error(
    "Usage: node scripts/render-cron.mjs <refresh-tokens|attach-next-reel|snapshot-followers>"
  );
  process.exit(2);
}

const baseUrl = process.env.CRON_BASE_URL ?? process.env.NEXTAUTH_URL;
const secret = process.env.CRON_SECRET ?? process.env.NEXTAUTH_SECRET;

if (!baseUrl || !secret) {
  console.error("CRON_BASE_URL/NEXTAUTH_URL and CRON_SECRET/NEXTAUTH_SECRET are required");
  process.exit(1);
}

const targetBaseUrl = /^[a-z][a-z0-9+.-]*:\/\//i.test(baseUrl)
  ? baseUrl
  : `http://${baseUrl}`;

const response = await fetch(
  `${targetBaseUrl.replace(/\/$/, "")}/api/cron/${route}`,
  {
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(180_000),
  }
);
const body = await response.text();

if (!response.ok) {
  console.error(`[cron] ${route} failed (${response.status}): ${body}`);
  process.exit(1);
}

console.log(`[cron] ${route} ok: ${body}`);
