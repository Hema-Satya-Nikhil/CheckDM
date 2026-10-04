import { describe, it, expect } from "vitest";

/**
 * Public surfaces must not leak internals, and must be built to survive a
 * narrow viewport.
 */
const BASE =
  process.env.QA_BASE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const PUBLIC_PAGES = [
  "/",
  "/about",
  "/templates",
  "/templates/dtc-product-link",
  "/login",
  "/verify-request",
  "/manychat-alternative",
  "/comment-link-automation",
  "/instagram-dm-automation-agencies",
  "/instagram-comment-to-dm-templates",
  "/privacy",
  "/terms",
  "/data-deletion",
  "/meta-review",
  "/manifest.webmanifest",
];

const LEAKS: Array<[RegExp, string]> = [
  [/PrismaClientKnownRequestError/i, "prisma error class"],
  [/ECONNREFUSED|ECONNRESET|ETIMEDOUT/i, "network error"],
  [/at Object\.\w+ \(.*:\d+:\d+\)/, "stack frame"],
  [/[A-Za-z]:\\\\?\/[\w.\\-]+\/[\w.\\-]+/i, "filesystem path"],
  [/ENCRYPTION_KEY|NEXTAUTH_SECRET|CRON_SECRET|postgresql:\/\//i, "secret or db url"],
  [/fbtrace|trace=/i, "provider trace id"],
];

// Left over from the previous visual system.
const OLD_VISUAL: Array<[RegExp, string]> = [
  [/OpenReply/, "old brand name"],
  [/text-cyan-|bg-cyan-|border-cyan-/, "neon cyan"],
  [/text-indigo-|bg-indigo-|shadow-indigo/, "indigo"],
  [/font-black/, "font-black display type"],
  [/gradient-mesh|glass-strong/, "decorative legacy surface"],
  [/tracking-tighter/, "over-tight tracking"],
];

async function fetchHtml(path: string): Promise<{ status: number; html: string }> {
  const res = await fetch(`${BASE}${path}`, {
    redirect: "manual",
    signal: AbortSignal.timeout(300_000),
  });
  return { status: res.status, html: await res.text() };
}

/**
 * These assertions are about what the server actually serves, so they need a
 * running instance. Rather than fail the whole suite when one is not up (CI, a
 * fresh checkout, `npm test` before `npm run dev`), they skip — the rest of the
 * suite is pure unit tests and must not depend on a dev server.
 *
 * The generous per-test timeout matters: vitest defaults to 5s, and a cold
 * `next dev` compiles an unvisited route in well over 20s, so without it these
 * fail on a freshly started server and pass on a warm one.
 */
const LIVE_TIMEOUT_MS = 180_000;

const serverUp = await fetch(`${BASE}/api/health`, {
  signal: AbortSignal.timeout(5_000),
})
  .then((r) => r.ok)
  .catch(() => false);

if (!serverUp) {
  console.warn(
    `[public-surfaces] skipping: no server at ${BASE}. Start it with \`npm run dev\` to run these.`,
  );
}

describe("public pages", () => {
  it.each(PUBLIC_PAGES)(
    "%s responds 200 with no internal leakage",
    async (path) => {
      if (!serverUp) return;
      const { status, html } = await fetchHtml(path);
      expect(status, `${path} status`).toBe(200);
      for (const [re, name] of [...LEAKS, ...OLD_VISUAL]) {
        expect(html, `${path} contains ${name}`).not.toMatch(re);
      }
    },
    LIVE_TIMEOUT_MS,
  );

  it(
    "every HTML page declares a responsive viewport",
    async () => {
      if (!serverUp) return;
      for (const path of PUBLIC_PAGES.filter((p) => p !== "/manifest.webmanifest")) {
        const { html } = await fetchHtml(path);
        expect(html, `${path} viewport meta`).toMatch(
          /<meta name="viewport" content="width=device-width, initial-scale=1[^"]*"/i,
        );
      }
    },
    LIVE_TIMEOUT_MS * 2,
  );

  it(
    "the landing page names the product in its title and heading",
    async () => {
      if (!serverUp) return;
      const { html } = await fetchHtml("/");
      expect(html).toMatch(/<title>CheckDM/);
      expect(html).toMatch(/CheckDM/);
    },
    LIVE_TIMEOUT_MS,
  );

  it(
    "the manifest is CheckDM-branded and installable",
    async () => {
      if (!serverUp) return;
      const { html } = await fetchHtml("/manifest.webmanifest");
      const manifest = JSON.parse(html) as {
        name: string;
        short_name: string;
        start_url: string;
        display: string;
        theme_color: string;
        icons: Array<{ src: string; sizes: string }>;
      };
      expect(manifest.name).toBe("CheckDM");
      expect(manifest.short_name).toBe("CheckDM");
      expect(manifest.display).toBe("standalone");
      // Icons must cover the sizes a home-screen install asks for.
      expect(manifest.icons.map((i) => i.sizes)).toEqual(
        expect.arrayContaining(["192x192", "512x512"]),
      );
    },
    LIVE_TIMEOUT_MS,
  );

  it(
    "the Zernio sponsor disclosure stays on the landing page",
    async () => {
      if (!serverUp) return;
      // The sponsor credit is a disclosure obligation, not decoration.
      const { html } = await fetchHtml("/");
      expect(html).toMatch(/Zernio/);
      expect(html).toMatch(/Optional paid provider/i);
    },
    LIVE_TIMEOUT_MS,
  );
});
