# Zoho Catalyst deployment evaluation (read-only, pre-deployment)

**Status:** evaluation only. Nothing was deployed, no Catalyst resources were
created, no account was accessed, no application code, Prisma schema, migration
or Render configuration was modified. No migrations were run and no database was
contacted.

**Date of research:** 2026-10-04. All Catalyst documentation findings below were
read from `docs.catalyst.zoho.com` on that date; section `last_updated` dates are
2026-09-15 to 2026-09-29.

---

## 1. Executive summary

**Recommendation: NO-GO for a full Catalyst deployment. CONDITIONAL-GO for
exactly one narrow use case.**

Catalyst cannot host this application's two hard requirements — an always-on
BullMQ worker and a native-protocol Redis — because of documented platform
limits, not ambiguity:

1. **AppSail instances are request-scoped, not long-running.** Documented limit:
   an instance "will be active for 5 minutes in total", and inactive instances
   "will be scaled down after 5 minutes of uptime". `docs/stack.md:29-31` already
   records that the worker "**Must stay always-on**, so it cannot run on Vercel —
   it needs an always-on host." AppSail is the same class of platform. Deploying
   the custom-runtime (OCI) path does **not** help: the docs state the platform
   configures AppSail services identically regardless of runtime type.
2. **Catalyst Cache is not Redis-protocol compatible.** It is a String-only
   key/value store behind an HTTP REST API with `Zoho-oauthtoken` auth. No
   `redis://` endpoint, no RESP protocol, no ioredis/node-redis support is
   documented anywhere. `docs/stack.md:33-34` already records the requirement:
   Redis "Must speak the native Redis protocol over TCP (an HTTP-only Redis will
   not work with BullMQ)."
3. **Catalyst Data Store is not reachable from Prisma.** The underlying engine is
   never named in the documentation, there is no connection string and no port,
   and access is exclusively HTTP REST + Zoho OAuth. A `pg` client and
   `@prisma/adapter-pg` (`lib/db/client.ts:1,15`) cannot connect to it.

Per your instruction, Catalyst Data Store and Cache were **not** proposed as
replacements for PostgreSQL and Redis.

The consequence is structural: Catalyst could host only the stateless Next.js
HTTP tier, while 100% of the stateful complexity — PostgreSQL, Redis, the worker,
and the comment-reconciler sweep — remains on external providers. That is a
worse outcome than the zero-cost stack already documented and proven in
`docs/stack.md:40-52`, because it adds a platform failure mode without removing
any cost.

---

## 2. Compatibility table

Legend: **VERIFIED** = stated in official documentation with a quote.
**INFERRED** = logical consequence of a verified constraint, flagged as such.
**UNKNOWN** = not documented; must be validated with Catalyst Support or
empirically. **BLOCKED** = verified incompatibility.

| # | Component | CheckDM requirement (source) | Catalyst capability | Verdict |
|---|---|---|---|---|
| 1 | Next.js 16 web app | Long-running HTTP server, `npm run start` (`package.json:10`) | AppSail deploys Node.js apps with a configurable startup command | **PARTIAL** — see #2, #3, #12 |
| 2 | Node.js runtime | Node 20 in Dockerfile (`Dockerfile:21,32`); `package.json` has no `engines` | "Node.js: Node 24, Node 22, Node 20, Node 18, Node 16" | **VERIFIED OK** — Node 20 or 22 available. Minor: exact patch level not documented |
| 3 | Listen port | `next start` defaults to 3000 | Must listen on `X_ZOHO_CATALYST_LISTEN_PORT`; "Port 9000 will be used by default"; "start listening in the listening port within 10 seconds" | **BLOCKED as configured** — needs `sh -c 'PORT=$X_ZOHO_CATALYST_LISTEN_PORT npm start'`. Config-only change, **not yet made** |
| 4 | Startup command shell | `npm run start` | "the startup commands are executed directly without any involving any shell operations" | **VERIFIED CONSTRAINT** — shell features require explicit `sh -c '…'` |
| 5 | Dependency install | `npm ci` + `npm run build` (`Dockerfile:25,30`) | Catalyst does **not** run builds: "You must ensure that you add all node modules and configuration files … in the build path." `app-config.json` `scripts.predeploy` is documented only with a Maven example | **UNKNOWN** — whether `npm ci` / `prisma generate` can run platform-side is not documented. Must be built and shipped pre-installed |
| 6 | **BullMQ worker** | Always-on, concurrency 5, blocking Redis (`worker/dm-worker.ts:7,48-49,1614`; `docs/stack.md:29-31`) | "An app instance, when spawned, will be active for 5 minutes in total." / "Inactive app instances will be scaled down after 5 minutes of uptime" | **BLOCKED** — verified hard incompatibility |
| 7 | Custom runtime (OCI) as worker workaround | Same worker requirement | "you can deploy container images … After they are deployed on Catalyst, you can configure and manage all AppSail services and their platform in the same way" | **BLOCKED** — custom runtime inherits the same 5-minute lifecycle. Also "Catalyst only supports the deployment of OCI-compliant images built for the Linux AMD64 (x86-64) platform" |
| 8 | **Redis for BullMQ** | Native Redis over TCP, `maxRetriesPerRequest: null`, Lua/blocking/sorted-set commands (`lib/queue/client.ts:14-16`) | Cache is String-only KV over HTTP REST; no Redis protocol documented | **BLOCKED** — verified incompatibility |
| 9 | Catalyst Cache capability details | BullMQ needs Lua (`EVALSHA`), `BLPOP`, `MULTI/EXEC`, hashes, sorted sets | Zero documentation for any of these; only 4 CRUD operations | **BLOCKED** — additionally: 16,000-char value cap, 48-hour hard TTL ceiling, 1,000 GET/month free |
| 10 | **PostgreSQL for Prisma** | `postgresql://` via `@prisma/adapter-pg` (`lib/db/client.ts:15`) | Data Store engine unnamed; no connection string or port; REST + OAuth only | **BLOCKED** — verified incompatibility |
| 11 | Prisma features in use | `String[]`, `@db.Date`, `Json`, composite `@@id`, `cuid()`, `P2002` unique-violation handling (`prisma/schema.prisma`) | Catalyst Data Store columns are typed but a different engine | **BLOCKED** by #10; independently unverified for Catalyst |
| 12 | Health check `/api/health` | `healthCheckPath: /api/health` (`render.yaml:7`) | No health check configuration documented in AppSail | **UNKNOWN / NOT DOCUMENTED** — no `healthcheck` key, no console section |
| 13 | Request timeout | Health check does 4 dependent I/O calls (`app/api/health/route.ts:60-70`) | "An app request needs to be completed in 30 seconds." | **UNKNOWN** — cold start plus 4 external round-trips may approach 30s. Must be measured |
| 14 | Concurrency / scale | 5 job workers (`lib/queue/dm-worker.ts:1614`) | 100 concurrent requests per instance; max 5 instances per app; scale-out at 80 requests | **VERIFIED OK** — ample for the web tier |
| 15 | Services per project | 1 web service needed | "You can only create 5 AppSail services in a single Catalyst project." | **VERIFIED OK** |
| 16 | Cron: `attach-next-reel` every 5 min | `render.yaml:114` `*/5 * * * *` | "The minimum recurring frequency a cron can be triggered at is one minute." 5-field expression (Mins/Hrs/Day(Month)/Month/Day(Week)) with `* , - / #` | **VERIFIED OK** |
| 17 | Cron: `refresh-tokens` 05:00, `snapshot-followers` 07:00 | `render.yaml:142,170` | Timezone selectable per cron; API field `job_detail.timezone` | **VERIFIED OK** |
| 18 | Cron timezone default | Render/Vercel behaviour is UTC | Not stated. Console only pre-populates "The time zone you are currently present in" | **UNKNOWN** — must set timezone explicitly, do not rely on default |
| 19 | Cron auth (`Bearer` token) | `Authorization: Bearer $CRON_SECRET` (`app/api/cron/*/route.ts:18`) | Custom headers supported: "you can include a header that specifies the **authorization type** used". No explicit `Authorization`/`Bearer` example anywhere | **UNKNOWN** — plausible via generic custom headers, unproven. **Must be tested before relying on it** |
| 20 | Cron target = AppSail service | Calls its own `/api/cron/*` routes | Webhook job pool takes "any third-party URL"; AppSail job pool takes a URL *path* + service ID | **VERIFIED OK** via a Webhook job pool pointed at the public AppSail URL |
| 21 | Cron execution timeout | Sweeps must finish | 15-minute timeout documented for **Function** jobs only | **UNKNOWN** for Webhook/AppSail targets |
| 22 | **Comment reconciler sweep** | Runs **inside the worker** every 5 min; not exposed as an HTTP route (`worker/dm-worker.ts:34-49`) | No platform feature replaces a worker-internal interval | **BLOCKED** — cannot be moved to Catalyst Job Scheduling without changing application logic, which is out of scope |
| 23 | Environment variables | 15+ vars; see §5 | Per-app key/value, separate dev and production values, readable via `process.env` | **VERIFIED OK** — but see #24 |
| 24 | Secret masking / encryption at rest | `NEXTAUTH_SECRET`, `ENCRYPTION_KEY`, `INSTAGRAM_APP_SECRET` | Only plain "key-value pairs" documented. No masking, no secret type, no encryption-at-rest claim | **UNKNOWN** — treat console values as plaintext. Production values require a prior production deploy |
| 25 | Public HTTPS URL | `NEXTAUTH_URL` must be a stable HTTPS origin (`docs/deploy-render.md:34-35`) | `https://appsailservicename-ZAID.catalystappsail.com` in production | **VERIFIED OK** — but the URL embeds the ZAID, so it is only known after first deploy |
| 26 | TLS termination | HTTPS required by Meta webhooks and OAuth | All doc URLs use `https://`. Words "TLS", "SSL", "certificate" appear **zero times** | **UNKNOWN** — inferred HTTPS from URL scheme only |
| 27 | Custom domain | Needed for a stable `NEXTAUTH_URL` | "you have the option to map your own domain to an AppSail service" — stated once, **no procedure documented**. Only sub-domain label editing within `catalystappsail.com` is documented | **UNKNOWN** — treat as unavailable until Support confirms |
| 28 | Instagram OAuth callback | `https://<domain>/api/instagram/callback` (`docs/deploy-render.md:83`) | Inbound HTTPS to any path on the service | **VERIFIED OK** — requires a stable domain (see #27) |
| 29 | Inbound webhooks (Meta + Zernio) | `/api/webhook`, `/api/zernio/webhook/<workspaceId>` | Inbound HTTP to the service; signature verification is app-side and unaffected | **VERIFIED OK** — subject to #27 for the Zernio URL |
| 30 | Outbound network to external PG/Redis | Web tier must reach Neon/Redis Cloud | "grants network access in your application … and connect to the Internet". **No** egress allowlist, source IPs, VPC or private-endpoint documentation | **UNKNOWN** — plausible; no documented egress policy either way |
| 31 | Memory / disk | Next.js production needs more than defaults | Default 512 MB memory, 256 MB disk; selectable 128–2048 MB | **UNKNOWN** — 512 MB default is untested for this build; 256 MB disk is likely too small for `.next` + `node_modules` |
| 32 | WebSockets | Not used in production paths (`next.config.ts` limits `allowedDevOrigins` to dev only) | Not documented | **N/A** |
| 33 | Prisma migration strategy | `npm run db:migrate` = `prisma migrate deploy` in the Render start command (`render.yaml:6`) | No build/start hook documented that is proven to work for Node.js | **UNKNOWN** — must run as an explicit pre-start step; note `scripts.cron.sh` already uses `set -u` semantics and would need a shell wrapper |
| 34 | Student program eligibility | CheckDM is a B2B SaaS ("ManyChat Alternative — B2B Instagram Comment → DM SaaS schema", `prisma/schema.prisma:1`) | Program covers "non-commercial applications"; the $250 threshold exists "as a safeguard to ensure the student program remains focused on genuine educational and non-commercial use" | **RISK** — see §6. Commercial use is outside the stated terms |

---

## 3. Official documentation links

**Student program**
- https://catalyst.zoho.com/students — "$250 in Catalyst usage over a six-month
  period at no cost"; "no subscription fee or credit card required"; "Students
  will not be automatically charged"; application is "temporarily stopped" at the
  threshold; extension available via Support review.
- https://www.zoho.com/catalyst/free-tier/ — full per-component free-tier table.

**AppSail**
- https://docs.catalyst.zoho.com/en/serverless/help/appsail/introduction/
- https://docs.catalyst.zoho.com/en/serverless/help/appsail/appsail-basics/ —
  instance lifecycle and the limits list (5-min lifetime, 5 instances/app, 100
  concurrent requests, 10s listen, 30s request, 5 services/project).
- https://docs.catalyst.zoho.com/en/serverless/help/appsail/appsail-configurations/ —
  startup commands (no shell), environment variables, memory/disk, ports.
- https://docs.catalyst.zoho.com/en/serverless/help/appsail/catalyst-managed-runtimes/key-concepts/ —
  supported Node.js versions, `app-config.json` fields, build-path requirements.
- https://docs.catalyst.zoho.com/en/serverless/help/appsail/console/overview/ — URL format.
- https://docs.catalyst.zoho.com/en/serverless/help/appsail/console/configurations/ — console env vars, port, memory.
- https://docs.catalyst.zoho.com/en/serverless/help/appsail/custom-runtimes/deploy-from-cli/ — OCI, Linux AMD64 only.
- https://docs.catalyst.zoho.com/en/serverless/help/appsail/implement-catalyst-sdk/ — SDK unavailable on custom runtime.

**Job Scheduling**
- https://docs.catalyst.zoho.com/en/job-scheduling/help/job/introduction/ — four target types.
- https://docs.catalyst.zoho.com/en/job-scheduling/help/job/key-concepts/ — methods, headers, URL params.
- https://docs.catalyst.zoho.com/en/job-scheduling/help/cron/key-concepts/ — 5-field cron, 1-minute floor.
- https://docs.catalyst.zoho.com/en/job-scheduling/help/implementation/submit-job-predefined-cron/ — timezone selector.
- https://docs.catalyst.zoho.com/en/job-scheduling/help/jobpool/key-concepts/ — pool limits, Function 15-min timeout.
- https://docs.catalyst.zoho.com/en/job-scheduling/help/implementation/manage-cron/ — enable/disable, submit-job-now.

**Cloud Scale (data + cache)**
- https://docs.catalyst.zoho.com/en/cloud-scale/help/data-store/introduction/
- https://docs.catalyst.zoho.com/en/cloud-scale/help/cache/introduction/
- https://docs.catalyst.zoho.com/en/cloud-scale/help/cache/architecture/ — "Catalyst implements and manages Redis cache"; HTTP String KV surface.
- https://docs.catalyst.zoho.com/en/cloud-scale/help/cache/key-concepts/ — String-only; 48-hour max TTL.
- https://docs.catalyst.zoho.com/en/api/code-reference/cloud-scale/cache/insert-key-value-in-segment/ — 16,000-char value cap, `expiry_in_hours` max 48.

**Billing**
- https://docs.catalyst.zoho.com/en/deployment-and-billing/billing/pay-as-you-go-model/ — "minimum billing amount of USD 5".
- https://docs.catalyst.zoho.com/en/deployment-and-billing/billing/free-tier/ — free tier is pay-as-you-go only.
- https://www.zoho.com/catalyst/free-tier/ — AppSail "Container runtime $0.0013 / GB-minute, 900 GB-minutes" per month.

---

## 4. Recommended architecture and estimated cost

### 4a. Recommended: do not use Catalyst (lowest cost, already proven)

`docs/stack.md:40-52` already documents a zero-cost reference stack that matches
this application's requirements exactly:

| Piece | Service | Cost | Evidence |
|---|---|---|---|
| Web app | Vercel Hobby | $0 | `docs/stack.md:47` |
| PostgreSQL | Neon free (~0.5 GB) | $0 | `docs/stack.md:48` |
| Redis | Redis Cloud Essentials free (30 MB, TCP) | $0 | `docs/stack.md:49` |
| Always-on worker | Oracle Cloud Always Free VM + pm2 | $0 | `docs/stack.md:50` |
| Login email | Resend free (3k/mo) | $0 | `docs/stack.md:51` |
| Instagram API | Meta app with Instagram Login | $0 | `docs/stack.md:52` |

**Total: $0/month, no credit card.** This stack already satisfies every
"always-on" and "native Redis protocol" constraint that Catalyst fails.

Carry-forward caveat: `render.yaml` uses Render's managed Key Value and sets
`maxmemoryPolicy: noeviction` (`render.yaml:198`). Redis Cloud's free tier does
**not** permit changing `maxmemory-policy`. BullMQ requires `noeviction`, so
verify this before switching Redis providers.

### 4b. Conditional Catalyst option: web tier only (NOT recommended)

If you want Catalyst purely as the Next.js front door, keeping PostgreSQL,
Redis, the worker and the comment reconciler on external providers:

| Tier | Host | Cost/month |
|---|---|---|
| Next.js web | Catalyst AppSail, Node 20, 512 MB+ | within 900 GB-min free tier, then $0.0013/GB-min |
| PostgreSQL | Neon free | $0 |
| Redis | Redis Cloud free | $0 |
| **BullMQ worker** | **must be external** (Oracle Always Free VM / Fly / Railway) | $0 – $5 |
| Catalyts Job Scheduling | 3 crons | no documented free-tier line item — UNKNOWN |
| Bandwidth | Catalyst: "Bandwidth is free, always." No bandwidth line item in the free-tier table | $0 |

**AppSail free-tier ceiling, quantified.** 900 GB-minutes/month ÷ 0.5 GB
(default 512 MB memory) = **1,800 instance-minutes = 30 instance-hours/month**
(~1 hour/day). Because instances spawn on demand and live at most 5 minutes, a
low-traffic dashboard plus occasional Meta/Zernio webhooks would likely fit —
but there is no headroom for a burst, and exceeding it triggers the $5/project
minimum bill rather than a hard stop.

**Why this option is worse than 4a despite the $0 headline:**
- Catalyst provides no component the app can actually use. Data Store: blocked
  (#10). Cache: blocked (#8). Worker: blocked (#6). So you get a serverless HTTP
  proxy in front of three external services.
- You inherit a **second** failure domain and a **second** set of environment
  variables to keep in sync across two providers.
- `$250 / 6 months` is a shared project budget. Burning it on instance uptime
  for a component that hosts no data is the worst possible allocation if you
  later want Catalyst for something it does support.
- Every UNKNOWN in rows 12, 13, 18, 19, 21, 24, 26, 27, 31, 33 becomes a
  production risk on a platform where the worker cannot be co-located to
  compensate.

### 4c. Full external cost, for reference

| Item | Free option | Paid fallback |
|---|---|---|
| PostgreSQL | Neon free ~0.5 GB | Neon paid from ~$19/mo; Supabase from ~$25/mo |
| Redis | Redis Cloud free 30 MB | Redis Cloud Essentials ~$30/mo; Aiven/Upstash pay-per-GB |
| Always-on worker | Oracle Always Free VM | Fly.io ~$3–5/mo; Railway $5 credit then usage-based |
| Bandwidth | Catalyst: free (student page). External hosts: typically free tiers apply | metered |

---

## 5. Environment variables (names only — no values read or copied)

Per your constraint, `.env` was **not** opened. Names were derived from source
references and `.env.example`.

Shared by web and worker (mismatched values break token decryption — see
`docs/stack.md:36-38`): `DATABASE_URL`, `REDIS_URL`, `NEXTAUTH_URL`,
`NEXTAUTH_SECRET`, `CRON_SECRET`, `ENCRYPTION_KEY`.

Web only: `RESEND_API_KEY`, `EMAIL_FROM`, `ALLOWED_EMAILS`, `EMAIL_SERVER`,
`META_GRAPH_API_VERSION`, `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`,
`FACEBOOK_APP_SECRET`, `WEBHOOK_VERIFY_TOKEN`. `NODE_ENV=production`.

Worker only: `COMMENT_POLL_INTERVAL_MS`, `COMMENT_POLL_LOOKBACK_HOURS`,
`COMMENT_POLL_MAX_PER_SWEEP`.

Catalyst-specific additions that would be needed: `X_ZOHO_CATALYST_LISTEN_PORT`
(platform-provided). Zernio credentials are stored through the in-app Settings
flow, not environment variables (`docs/deploy-render.md:45-46`).

---

## 6. Exact unknowns and blockers

### Hard blockers (verified incompatibility — no configuration can fix these)

- **B1 — Always-on BullMQ worker cannot run on AppSail.** Instances are capped at
  5 minutes of total uptime and scale down when inactive. Applies to both the
  Catalyst-managed runtime and the OCI custom runtime. `docs/stack.md:29-31`
  already documents that this worker requires an always-on host.
- **B2 — Catalyst Cache cannot back BullMQ.** No Redis wire protocol is
  documented; the API is String-only KV over HTTP with a 16,000-character value
  cap and a 48-hour maximum TTL. Lua scripting, blocking pops, `MULTI/EXEC`,
  hashes and sorted sets are entirely undocumented. Free tier is 1,000 GET /
  5,000 PUT / 5,000 UPDATE requests per month, account-wide.
- **B3 — Catalyst Data Store cannot back Prisma.** Engine unnamed, no connection
  string, no port, no `pg`/Postgres wire access; HTTP REST + Zoho OAuth only.
- **B4 — The comment reconciler cannot be relocated without changing application
  logic.** It runs on a `setInterval` inside `worker/dm-worker.ts:34-49` and has
  no HTTP route. Since B1 removes the worker, this safety net for missed
  Instagram webhooks would be lost unless application code changes — which is out
  of scope for this task.

### Governance blocker

- **G1 — Student program eligibility for a commercial B2B SaaS.** The program
  covers "non-commercial applications" and states the $250 threshold exists "as a
  safeguard to ensure the student program remains focused on genuine educational
  and non-commercial use". `prisma/schema.prisma:1` describes CheckDM as a "B2B
  Instagram Comment → DM SaaS". If you intend to operate it commercially, the
  deployment would fall outside the stated terms; at the threshold the
  application is "temporarily stopped" and Support would review the project.
  **Confirm eligibility with Catalyst Support before deploying anything**, even
  for evaluation.

### Unknowns requiring validation (each is a potential production failure)

| ID | Unknown | Why it matters | How to resolve |
|---|---|---|---|
| U1 | Whether AppSail runs a build step for Node.js (`npm ci`, `prisma generate`) | Build artifacts and the generated Prisma client must exist in the build path | Ask Support; otherwise build and ship pre-installed |
| U2 | Health-check path configuration | `render.yaml:7` relies on it; not documented in AppSail | Ask Support |
| U3 | Cold-start + 4 external I/O calls against the 30s request timeout | `/api/health` may time out | Measure with a real instance |
| U4 | Whether Job Scheduling custom headers can carry `Authorization: Bearer` | Cron routes return 401 without it (`app/api/cron/*/route.ts:18`) | Test with a throwaway endpoint first |
| U5 | Job Scheduling default timezone | Silent 5-hour drift on the 05:00/07:00 jobs | Set the timezone explicitly; never rely on the default |
| U6 | Job Scheduling execution timeout for Webhook targets | Long sweeps could be cut off | Ask Support |
| U7 | Job Scheduling free-tier allowance | No line item in the pricing or free-tier tables | Ask Support |
| U8 | Outbound egress policy / source IPs to Neon and Redis Cloud | Blocks the web tier entirely if restricted | Ask Support, or test from a dev instance |
| U9 | Environment-variable encryption at rest and console masking | Secrets may be stored and displayed in plaintext | Ask Support |
| U10 | TLS termination and certificate management | Required by Meta webhooks and OAuth | Assume HTTPS from the URL scheme only; confirm |
| U11 | Custom domain mapping procedure | Without it, `NEXTAUTH_URL` embeds the ZAID and is only known post-deploy; Zernio's per-workspace webhook URL is derived from the base URL | Ask Support |
| U12 | Whether 512 MB memory / 256 MB disk is sufficient | 256 MB disk is likely too small for `.next` + `node_modules` + Prisma client | Test |
| U13 | Whether `scripts.predeploy` in `app-config.json` works for Node.js | Only a Maven example is documented | Ask Support |
| U14 | Cold-start penalty when a cron interval exceeds the 5-minute instance lifetime | `attach-next-reel` runs every 5 minutes, exactly at the instance cap | Measure |

---

## 7. Manual Catalyst dashboard setup steps

**These are reference steps for the conditional web-tier-only option (4b). They
are NOT a recommendation, and step 0 is a hard gate. Do not execute any of this
until B1–B4 are accepted and G1 is resolved.**

**Step 0 — Gate.** Confirm student-program eligibility with
`support@zohocatalyst.com` (cite G1). Confirm U1, U2, U8, U11. Do not proceed
without U8: if outbound egress to your PostgreSQL/Redis provider is restricted,
nothing else matters.

**Step 1 — Create the project.** Catalyst console → create project. Note the ZAID;
the AppSail production URL embeds it.

**Step 2 — Do not create Data Store or Cache.** They are unusable by this
application (B2, B3). Creating them consumes free-tier quota for nothing.

**Step 3 — Provision external datastores first.** Create the Neon PostgreSQL
database and the Redis Cloud instance. Record `DATABASE_URL` and `REDIS_URL` in
your own password manager — do not paste them into this repository. Confirm both
accept connections from Catalyst's egress (U8) using a throwaway client.

**Step 4 — Build locally, not on Catalyst.** Run `npm ci` and `npm run build` on
your machine (or in CI) so `.next/`, `node_modules/`, `app/generated/prisma/`,
`prisma/`, `tsconfig.json` and `package.json` are all present in the build path
(U1, U13). Build on Linux to avoid the documented OS-specific-dependency
hazard.

**Step 5 — Deploy the AppSail service.** Serverless → AppSail → add service →
Catalyst-managed runtime → Node.js → stack `NodeJS 20` → source directory = your
build directory. Startup command:

```
sh -c 'sh scripts/catalyst-prestart.sh && PORT=$X_ZOHO_CATALYST_LISTEN_PORT npm run start'
```

The `sh -c` wrapper is mandatory (row 4). `scripts/catalyst-prestart.sh` does not
exist yet and would run `npx prisma migrate deploy` — creating it is a
configuration change and was **not** performed.

**Step 6 — Set memory and disk.** Start at 1024 MB memory. Raise disk well above
the 256 MB default (U12).

**Step 7 — Environment variables.** Console → AppSail → Configurations →
Environmental Variables. Add the **production** values for every name in §5,
plus the three Catalyst Job Scheduling cron secrets. Production values require a
prior production deploy. Treat the console as plaintext (U9).

**Step 8 — Note the production URL** after the first production deploy:
`https://<service>-<ZAID>.catalystappsail.com`. This becomes `NEXTAUTH_URL`. If
U11 is unresolved, `docs/deploy-render.md:34-35`'s warning applies in reverse:
do not register external webhooks until the domain is final.

**Step 9 — Job Scheduling.** Create a Webhook-type Job Pool. Create three crons
against the production URL:

| Cron | Path | Expression | Timezone |
|---|---|---|---|
| attach-next-reel | `/api/cron/attach-next-reel` | `*/5 * * * *` | set explicitly (U5) |
| refresh-tokens | `/api/cron/refresh-tokens` | `0 5 * * *` | set explicitly (U5) |
| snapshot-followers | `/api/cron/snapshot-followers` | `0 7 * * *` | set explicitly (U5) |

Method `GET`. Header `Authorization` = `Bearer <CRON_SECRET>`. **Verify U4 with a
single manual "Submit Job" before trusting the schedule** — the routes return 401
on any mismatch (`app/api/cron/*/route.ts:18`).

**Step 10 — Deploy the worker elsewhere.** Not on Catalyst (B1). It needs
`DATABASE_URL`, `REDIS_URL`, `NEXTAUTH_SECRET`, `CRON_SECRET`, `ENCRYPTION_KEY`,
`INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `FACEBOOK_APP_SECRET`,
`META_GRAPH_API_VERSION`, `NODE_ENV=production`.

**Step 11 — Accept the degraded health endpoint.** `/api/health` returns 503
whenever the worker heartbeat is older than 120s (`app/api/health/route.ts:72-89`,
`lib/ops/worker-health.ts:5`). With Catalyst's 5-minute instance lifecycle and
no documented health-check configuration (U2), this endpoint should be treated as
diagnostic output, not as a gate.

**Step 12 — External configuration, last.** Only after steps 5–11 are verified:

- Instagram OAuth callback: `https://<domain>/api/instagram/callback`
- Meta webhook: `https://<domain>/api/webhook`
- Zernio webhook: `https://<domain>/api/zernio/webhook/<workspaceId>`
- Resend requires a verified sending domain matching `EMAIL_FROM`
  (`docs/deploy-render.md:85-88`).

**Step 13 — Budget guardrails.** Set a Catalyst budget alert. Remember that
exceeding any free-tier component triggers a **$5/project minimum bill**, and
that you are notified at 90% of the limit.

---

## 8. Go / no-go recommendation

### Full Catalyst deployment (web + worker + Catalyst PostgreSQL + Catalyst Redis)

# ❌ NO-GO

Four verified blockers, each independently fatal: B1 (worker), B2 (Redis),
B3 (PostgreSQL), B4 (comment reconciler). This is not a configuration gap that
more research would close — the platform documents limits that contradict the
application's stated requirements, and the application already documents those
requirements in `docs/stack.md:24-38`.

### Hybrid Catalyst deployment (web tier on Catalyst, everything else external)

# ⚠️ CONDITIONAL — do not proceed without explicit sign-off on all of the following

1. Accept that Catalyst contributes **no** usable component, only an HTTP tier.
2. Resolve **G1** (student-program eligibility for a commercial B2B SaaS) in
   writing with Catalyst Support. Deploying outside the stated terms risks the
   application being stopped at $250.
3. Resolve **U8** (outbound egress to your database and Redis). This is binary:
   if egress is restricted, the option is dead.
4. Resolve **U11** (stable custom domain). Without it, the Zernio per-workspace
   webhook URL and the Instagram OAuth callback cannot be registered stably.
5. Empirically prove **U4** (`Authorization: Bearer` on Job Scheduling) before
   depending on Catalyst for `refresh-tokens`. If that cron silently fails, the
   Instagram token expires and — per `scripts/cron.sh:5-7` — "every automation
   stops without a single error."
6. Accept the cost cliff: 30 instance-hours/month of AppSail free tier, then
   $0.0013/GB-minute with a $5/project minimum.
7. Accept that **B4 remains open**: moving the comment reconciler off the worker
   requires application changes that are explicitly out of scope here.

### Recommended path forward

**Keep Catalyst's student credits unspent and deploy on the stack already proven
in `docs/stack.md:40-52` (Vercel + Neon + Redis Cloud + Oracle Always Free VM,
$0/month, no card).** It satisfies every constraint Catalyst fails, needs no
application changes, and preserves the Render configuration in `render.yaml`
untouched.

If you want Catalyst specifically — for the credits, the CLI/MCP tooling, or
learning — the cheapest defensible use is a **separate, non-production sandbox
project** running a trivial Node.js app, which stays inside the non-commercial
student-program terms and validates U1, U2, U3, U8, U9, U10 and U12 cheaply
before you consider anything larger.

---

## 9. Evidence provenance

- Repository inspection: read-only. Files read include `package.json`,
  `render.yaml`, `vercel.json`, `next.config.ts`, `prisma.config.ts`,
  `prisma/schema.prisma`, `Dockerfile`, `docker-compose.yml`, `.env.example`,
  `worker/dm-worker.ts`, `lib/queue/client.ts`, `lib/queue/dm-worker.ts`,
  `lib/db/client.ts`, `lib/auth.ts`, `lib/env.ts`, `lib/ops/worker-health.ts`,
  `lib/polling/comment-reconciler.ts`, `app/api/health/route.ts`,
  `app/api/cron/*/route.ts`, `app/api/instagram/callback/route.ts`,
  `scripts/cron.sh`, `scripts/render-cron.mjs`, `docs/stack.md`,
  `docs/deploy-render.md`.
- `.env` was **not** opened. No secret values appear in this document.
- No Prisma migration was run. No database connection was opened.
- No Git operation was performed. No file other than this document was created or
  modified.
- Catalyst documentation was read via `docs.catalyst.zoho.com` public pages,
  including the site's `llms-full.md` LLM-aggregated mirrors. No Catalyst
  account was accessed and no credentials were requested or used.