# Deploying CheckDM on Voroa (free tier)

**Status:** preparation only. Nothing has been deployed to Voroa, no account was
accessed, no cloud resources were created, and no paid service was enabled.

This document supersedes nothing. `render.yaml` and `docs/deploy-render.md` are
untouched and remain valid; `docs/deploy-dokploy.md` and `docs/setup.md` also
still apply. Choose one host.

**Why Voroa.** The Catalyst evaluation in `docs/deploy-catalyst-evaluation.md`
concluded that Catalyst cannot host this application: its instances are capped at
5 minutes of uptime, its Cache is not Redis-protocol compatible, and its Data
Store is not reachable by Prisma. Voroa is the first platform examined that
satisfies all three of the application's documented hard requirements.

**Research date:** 2026-10-04. Voroa documentation "Last updated" dates range
2026-07-06 to 2026-10-03.

---

## 1. Voroa service limits (free plan, verified)

From `https://getvoroa.com/docs/free-instances/`:

| Limit | Free plan |
|---|---|
| Services (total, all kinds) | **Up to 4** |
| Background workers | **1** |
| Scheduled tasks | **2** |
| Memory per service | 512 MB (Nano, 0.1 vCPU shared) |
| Bandwidth | 5 GB / month |
| Build minutes | 500 / month |
| Custom domains | 2, automatic HTTPS |
| Managed Postgres | 1 per account |
| Managed Key Value | 1 per account |
| Team members | 1 |
| Projects / environments | 10 / 20 per project |

Verbatim on what counts as a service:

> "Anything that runs counts as one service, and they all share the same total:
> a web service or a static site, a background worker, a cron job, a managed
> Postgres or key-value database. Four is the whole stack most side projects
> need... Preview environments are not counted against this total, and neither
> are scheduled tasks attached to a service you already run."

BullMQ is named explicitly as a supported worker workload
(`https://getvoroa.com/background-workers/`):

> "### Queue consumers
> BullMQ, Celery, Sidekiq, RQ, Resque or your own loop over a queue."

And on idle behaviour (`https://getvoroa.com/docs/idle-sleep/`):

> "**Idle sleep is not available on Voroa today.** Nothing on your account
> sleeps, and no service is being stopped for being idle."

Plus `https://getvoroa.com/docs/free-instances/`:

> "Uptime behaviour | Currently stays running between requests"

This is the property that makes an always-on BullMQ worker viable on the free
tier. It is explicitly documented as current behaviour and **not** a permanent
guarantee.

### Free database capacity is not guaranteed

> "Subject to free database capacity being available across the platform, the
> free tier includes one managed Postgres and one managed key-value store per
> account... That capacity is limited and shared by everyone on the free tier, so
> a free database is not guaranteed to be available when you ask for one. If the
> platform is at its free database ceiling, creating a new free database is
> refused with a clear message rather than being silently queued."

Also: "A database on the free plan is not backed up."

---

## 2. Architecture mapping — fits the free tier exactly

| Requirement | Voroa service type | Consumes | Free quota |
|---|---|---|---|
| Next.js web service | Web Service | 1 service | 4 services |
| BullMQ background worker | Background Worker | 1 service + 1 worker slot | 4 services / **1 worker** |
| PostgreSQL | Managed Postgres | 1 service + 1 DB | 4 services / 1 DB |
| Redis-compatible Key Value | Managed Key Value | 1 service + 1 KV | 4 services / 1 KV |
| `refresh-tokens` (daily) | Scheduled Task | 1 task | **2 tasks** |
| `snapshot-followers` (daily) | Scheduled Task | 1 task | **2 tasks** |

**Total: 4/4 services, 1/1 background worker, 2/2 scheduled tasks, 1/1 Postgres,
1/1 Key Value. Exactly at every free limit — there is no headroom for a fifth
service or a third scheduled task.**

### Two of the three existing cron jobs need no scheduling at all

`worker/dm-worker.ts:34-49` already runs, on a `setInterval` inside the worker:

```ts
async function poll() {
  const attached = await attachPendingNextReels();   // attach-next-reel
  await reconcileComments();                          // comment polling safety net
}
```

So `attach-next-reel` and the comment-reconciler sweep are **already covered by
the worker** and must NOT be duplicated as scheduled tasks. Only
`refresh-tokens` and `snapshot-followers` need external scheduling — which is
exactly the two the free tier allows.

This is a genuine fit, not a workaround. Duplicating `attach-next-reel` as a
scheduled task would run it twice concurrently and risk double-binding a campaign.

---

## 3. Service-by-service configuration

Voroa has **no infrastructure-as-code file yet** — `Blueprints overview` and
`voroa.yaml reference` are both marked "Soon" in the docs nav
(`https://getvoroa.com/docs/blueprint-spec/` is unpublished). All configuration
is therefore dashboard work. Do not look for or create a `voroa.yaml`.

### 3.1 Managed PostgreSQL

1. **New → Database → PostgreSQL**
2. Size: **DB Nano** (₹0). Documented spec: 256 MB RAM, shared CPU,
   **100 connections**, **1 GB SSD**.
3. Version: **PostgreSQL 18 by default**; "On the free size you can pick 17 or
   16 when you create the database". Prisma 7 supports all three. Use the default.
4. Copy the connection URL. Documented form
   (`https://getvoroa.com/managed-postgresql-india/`):

   ```
   postgres://user:<password>@host:20481/orders?sslmode=require
   ```

   This is a standard PostgreSQL URL, so `@prisma/adapter-pg` in
   `lib/db/client.ts:15` works unchanged.
5. **Trusted sources**: "Until you set one, any address may attempt a connection
   (it still needs your password)". You may optionally restrict this to your own
   IP.
6. **External access**: needed so the local machine can run migrations. Prefer
   the **direct port**, not the pooled port — Prisma migrations and long-lived
   sessions need a direct connection.

### 3.2 Managed Key Value (Redis)

1. **New → Database → Key Value**
2. Size: **Cache Nano** (₹0) — 0.05 CPU, **128 MB RAM**.
3. **Eviction policy: leave at "Keep everything" (the default).** This is
   `noeviction`, which BullMQ requires. Documented at
   `https://getvoroa.com/docs/managed-databases/`:

   > "**Keep everything** — nothing is removed. When memory is full, new writes
   > are refused instead. Choose this for a queue or a counter, where a rejected
   > write is better than a missing entry. **This is the default.**"

   Voroa also maps `allkeys-lru`, `allkeys-lfu`, `allkeys-random`,
   `volatile-lru`, `volatile-lfu`, `volatile-random`, `volatile-ttl` by name.
   **Do not select any of them** — silently evicting queue keys loses jobs.
4. Copy the internal URL for services on Voroa (`redis://…`), or enable external
   access for a `rediss://` TLS endpoint on port 31427 if you need to connect from
   outside. There is no per-source IP allow list for Key Value.
5. Keep `maxRetriesPerRequest: null` as-is in `lib/queue/client.ts:15` — that is
   a BullMQ requirement and needs no change.

### 3.3 Web Service

| Field | Value | Source |
|---|---|---|
| Type | Web Service | — |
| Repository / branch | `Hema-Satya-Nikhil/CheckDM` / `main` | — |
| Root directory | `/` | repo root holds `package.json` |
| Runtime | **Docker** (recommended) or auto-detected Node | §4 |
| Node version | **22** | §4.1 |
| Build command | see §4 | — |
| Start command | see §4 | — |
| Health check path | `/api/health` | `app/api/health/route.ts` |
| Startup timeout | raise above the 180 s default | §5.1 |
| Instance | Nano (512 MB) | §6 |

Health check path is documented at `https://getvoroa.com/docs/health-checks/`:

> "**Health check path** is the path Voroa requests to decide whether a new
> version is working... Set it to something like `/healthz` and the deploy is
> marked Live only once that path answers with a 2xx status. The path is requested
> inside your own container, on the port your service listens on."

### 3.4 Background Worker

| Field | Value |
|---|---|
| Type | Background Worker |
| Repository / branch | same repo, `main` |
| Root directory | `/` |
| Runtime | **Docker** (recommended) — see §4 |
| Start command | see §4 |
| Build command | see §4 |
| Health check | **not applicable** — no port, hidden by Voroa |
| Instance | Nano (512 MB) |

Verbatim (`https://getvoroa.com/docs/deploy-background-worker/`):

> "A worker has no web port to check, so Voroa confirms it is running from the
> process state itself."

> "After the build finishes, your worker shows **Starting**, then **Live** once
> its process has stayed up for a full minute... If the process exits or starts
> looping in that time, the deploy is marked **Failed to start** instead of a
> false success."

`worker/dm-worker.ts` satisfies this: it creates a BullMQ `Worker`, registers
`SIGINT`/`SIGTERM` handlers, and holds open `setInterval` timers, so the process
stays alive. If it ever exits, Voroa restarts it, and after a day of restart
looping Voroa stops the service and emails you.

### 3.5 Scheduled Tasks (2)

Attach both to an **always-on** service — the Background Worker is the natural
host, since both jobs are database-and-Instagram work with no HTTP dependency.

| Task | Command | Schedule |
|---|---|---|
| refresh-tokens | `node scripts/render-cron.mjs refresh-tokens` | `0 5 * * *` |
| snapshot-followers | `node scripts/render-cron.mjs snapshot-followers` | `0 7 * * *` |

`scripts/render-cron.mjs` already exists, is written in plain Node with no build
step, and reads `CRON_BASE_URL` + `CRON_SECRET` (falling back to
`NEXTAUTH_SECRET`) — the same contract the Render cron jobs use.

> "At each scheduled time, Voroa runs your command **inside that service's
> running container**, using the same code, environment variables and files the
> service already has."

> "**Keep the service running.** The schedule only fires while the parent service
> is on."

Five-field cron expressions are supported, minimum interval one minute
(`*/5 * * * *` is valid). Note: "Voroa does not show per-run output for a
scheduled command" — outcomes are only visible via the database or logs.

---

## 4. Runtime selection: use Docker, not the native Node builder

### 4.0 The reason — `tsx` and `prisma` are devDependencies

`package.json` places both in `devDependencies`, and both are needed **at
runtime**:

| Binary | Used by | Needed at |
|---|---|---|
| `tsx` | `npm run worker` → `tsx --env-file-if-exists=.env worker/dm-worker.ts` | runtime |
| `prisma` | `npm run db:generate`, `npm run db:migrate` (`prisma migrate deploy`) | build + start |

Voroa's documentation is **silent** on whether devDependencies survive into the
running image. Neither `devDependencies`, `NODE_ENV`, `--omit=dev`, nor
`--production` appears anywhere in the build documentation, and the internal
install command is never disclosed — `https://getvoroa.com/docs/build-and-start-commands/`
only says:

> "Your build command runs after Voroa has set up the language runtime for your
> project — the Python virtual environment, or `node_modules`, are already in
> place"

The worker documentation actively cuts against relying on it:

> "**Install only what you run.** Development and testing packages do not need to
> be in the image that runs in production."

**The repository's `Dockerfile` already solves this correctly, and was written
for exactly this reason.** `Dockerfile:13-19`:

> "next.config.ts does not set `output: "standalone"`, so `next start` already
> requires the full node_modules tree at runtime... this Dockerfile does NOT try
> to strip node_modules/tsconfig.json/source files out of the final stage: doing
> so is exactly what breaks the worker (MODULE_NOT_FOUND on `@/lib/...` imports,
> because tsx has no tsconfig to resolve the alias against, and no
> app/generated/prisma to import from)."

`Dockerfile:25` runs `npm ci` (which installs devDependencies) and
`Dockerfile:42-53` copies the full tree — `node_modules`, `.next`,
`app/generated`, `lib`, `worker`, `prisma`, `scripts`, `tsconfig.json` — into
the runner stage.

**Recommendation: choose the Docker runtime for both the web service and the
worker.** It makes `tsx` and `prisma` availability deterministic instead of
unknown, and reuses a file already in the repository.

Dockerfile already sets `CMD ["npm", "run", "start"]`, which is the correct web
default. For the worker, override the start command to `npm run worker`.

**Cost of the Docker runtime:** you lose Voroa's health-check probe —
`https://getvoroa.com/docs/idle-sleep/` states "A service built from a
Dockerfile cannot have that health check today." Since idle sleep does not exist
at all today, the practical loss is only the automated 2xx gate; `/api/health`
remains available for manual and external monitoring.

### 4.1 Node version — pin this explicitly

`package.json` has **no** `engines` field and there is **no** `.nvmrc` or
`.node-version` file. `docs/deploy-dokploy.md:19` records the constraint:

> "Prisma 7 and Next.js 16 both require Node 20.19+, 22.12+, or 24+"

Voroa supports only **22, 20 and 18** (`https://getvoroa.com/docs/deploy-nodejs/`):
"Supported major versions are 22, 20 and 18." Node 24 is **not** available.

Two consequences:

1. **Never let Voroa pick.** Set the version explicitly in service settings.
2. **Major 22 may resolve too low.** `docs/deploy-dokploy.md:22` documents that
   Nixpacks resolved `22` to `22.11.0`, "just below Prisma's 22.12 minimum". Voroa
   may do the same. **Verify the resolved patch version in the first build log**
   before trusting the deployment.

Recommended: set Node **22** and confirm the build log shows ≥ 22.12. If it shows
22.11.x, set **20** and confirm ≥ 20.19.

To make the version travel with the code (and stop Voroa, Render and Dokploy
from guessing differently), add a `.node-version` file at the repo root
containing `22.13.1`. **This was deliberately not added as part of this
preparation**, because it changes build behaviour for the existing Render and
Dokploy deployments too. Add it only if you accept that.

### 4.2 Build and start commands

`&&` is documented and recommended (`https://getvoroa.com/docs/build-and-start-commands/`):

> "So include the build itself in the command:
> ```
> npm install && npm run build
> ```"

| Service | Build command | Start command |
|---|---|---|
| Web (native Node) | `npm install && npm run db:generate && npm run build` | `npm run db:migrate && npm run start` |
| Worker (native Node) | `npm install && npm run db:generate` | `npm run worker` |
| Web (Docker) | *(leave empty)* | `npm run start` |
| Worker (Docker) | *(leave empty)* | `npm run worker` |

Voroa's documented Next.js defaults are build `npm install && npm run build`,
start `npm run start`, and it supplies `PORT` at runtime — `next start` reads it
without configuration. `PORT` is reserved: "PORT is managed by the platform and
cannot be set."

**Migrations must run at start, never at build.** `docs/deploy-dokploy.md:56-64`
documents why: a build step has no route to the database, producing
`Error: P1001: Can't reach database server`. This is why the existing
`vercel-build` script (which bundles `prisma generate && prisma migrate deploy &&
next build`) must **not** be used as the Voroa build command.

---

## 5. Blockers and risks

Ordered by severity. Items 1 and 2 must be resolved before production traffic.

### 5.1 BLOCKER — Redis command compatibility with BullMQ is undocumented

Voroa describes Key Value as "Redis-compatible" but publishes **no** command
reference, compatibility matrix, or version number. Every command BullMQ depends
on is **UNKNOWN — NOT DOCUMENTED**:

| BullMQ requirement | Voroa documentation |
|---|---|
| Lua scripting (`EVAL`/`EVALSHA`) — used for atomic queue ops | not documented |
| Blocking pops (`BLPOP`, `BRPOPLPUSH`, `BLMOVE`) | not documented |
| Transactions (`MULTI`/`EXEC`) | not documented |
| Sorted sets (`ZADD`, `ZRANGEBYSCORE … LIMIT`, `ZRANGE`, `ZREM`, `ZCARD`) | not documented |
| Hashes (`HSET`/`HGET`/`HDEL`) | not documented |
| `SET` with `EX`/`PX`/`NX`, `SCAN`, `INFO`, `CLIENT` | not documented |

The only command-shaped text on the site is a decorative `AUTH` / `GET` mock-up.

`docs/stack.md:33-34` already records the requirement:

> "Redis: the BullMQ send queue and the per-account rate limiter. Must speak the
> native Redis protocol over TCP (an HTTP-only Redis will not work with BullMQ)."

**Action required:** confirm with Voroa support (`/docs/contact-support/`) that the
Key Value instance supports `EVALSHA`/`EVAL`, blocking list pops, and
`MULTI`/`EXEC`. If it does not, this architecture fails and the worker must stay
on Render, Fly, Railway or a VM.

Favourable evidence: Key Value is described as "its own container", is described
as "a Redis-compatible in-memory store", and the platform markets job queues on
it directly (`https://getvoroa.com/managed-redis-india/`):

> "### Job queues and locks
> A simple queue your background worker reads from, and locks that stop two
> processes doing the same work at once. Pair it with a background worker and the
> two are one platform, one region, one bill."

That is suggestive but not proof — it names no commands.

### 5.2 RISK — devDependency availability at runtime

See §4.0. Mitigated by using the Docker runtime. If you insist on the native Node
runtime, verify `tsx` and `prisma` are present before trusting the deployment.

### 5.3 RISK — 128 MB Key Value may be too small

Free Key Value is **128 MB**. `lib/queue/client.ts:89-101` retains:

- `removeOnComplete: { count: 1000 }` — last 1000 completed jobs
- `removeOnFail: { age: 300, count: 2000 }` — up to 2000 failed jobs
- plus per-account rate-limiter keys and the worker heartbeat/alerts keys
  (`lib/ops/worker-health.ts`)

That is comfortably hundreds of MB of potential keyspace under a busy month.
Voroa's own guidance is that a Key Value instance "is bounded by the memory of
their size". Watch memory in the Metrics tab; `kv_starter` (256 MB) is ₹425/month
if the free size is too tight. There is no connection ceiling published for any
Key Value plan.

Durability caveat, documented (`https://getvoroa.com/managed-redis-india/`):

> "Voroa writes your data to disk and takes a nightly snapshot, so a restart does
> not start from empty - but between writes, a crash can lose the most recent
> moments."

BullMQ's `CommentDelivery` / `PostbackDelivery` tables in Postgres are what make
duplicate sends survivable, so this risk is bounded rather than open-ended.

### 5.4 RISK — scheduled tasks run on IST and cannot be reconfigured

Verbatim (`https://getvoroa.com/docs/scheduled-tasks-cron/`):

> "Schedules run in **India Standard Time (IST, UTC+5:30)**. `0 2 * * *` means
> 2:00 AM IST, every day of the year — IST has no daylight saving, so the hour you
> pick never shifts on its own."

There is **no timezone selector**, and no `CRON_TZ` support is documented. So
`0 5 * * *` runs at **05:00 IST = 23:30 UTC the previous day**, not 05:00 UTC.

Assessment:
- `refresh-tokens` — harmless. `scripts/cron.sh:63` notes "the token refresh has a
  10-day window before expiry, so the exact hour does not matter — only that it
  happens every day."
- `snapshot-followers` — worth noting. `FollowerSnapshot.date` is
  `@db.Date` holding "Midnight UTC of the day this count belongs to"
  (`prisma/schema.prisma:157-158`). A snapshot taken at 23:30 UTC the previous
  day will be filed under the previous UTC date. Not corrupting, but the daily
  series will be offset from the UTC day boundary. Confirm the intended semantic
  before relying on it.

Also note: "A task may occasionally run late or overlap with a previous run.
Write commands that are safe to run more than once." Both cron routes are
idempotent, so this is acceptable.

### 5.5 RISK — no backups on the free Postgres

> "A database on the free plan is not backed up."

1 GB storage. At ~95% usage:

> "once usage passes about 95% of the limit, a Postgres database is placed in
> **read-only** mode... **Reads keep working.** ... **Writes are rejected.**
> Inserts, updates, and deletes fail, and your app sees an error from the
> database."

This application is write-heavy (every DM logged, every click tracked), so
running out of space is a full outage, not a degraded read-only experience. Take
manual backups from the dashboard and monitor storage. 100 connections is ample.

### 5.6 RISK — 512 MB may be tight for the Next.js build

Free compute is 512 MB RAM / 0.1 vCPU shared. `next build` for a 40+ route app
plus `prisma generate` in the same build may exceed this. Build minutes are
capped at 500/month. If the build is OOM-killed, the cheapest fix is a paid
Starter size (1 CPU / 1 GB, ₹298/mo + GST) for the web service only.

### 5.7 RISK — deploys can be blocked by build-minute limits

> "Today, nothing is switched off. Bandwidth and build minutes are measured and
> shown to you, but they are not enforced... This is deliberate while the numbers
> are still being validated against real usage."

Currently unenforced, but documented as capable of stopping builds.

### 5.8 Minor

- **No persistent disk.** "Anything your service writes to disk is lost on the
  next deploy or restart. This is true on every plan." CheckDM writes no
  application state to disk, so this is fine.
- **1 team member** on free — the owner only.
- **Health check on Docker services is unavailable** (§4.0).
- **`/api/health` returns 503 while the worker heartbeat is stale**
  (`app/api/health/route.ts:72-89`; 120 s TTL in
  `lib/ops/worker-health.ts:5`). During the first deploy, the web service can be
  marked Live before the worker has sent a heartbeat. With the Docker runtime
  Voroa will not gate on this path anyway.
- **`NODE_ENV=production`** must be set on both services. The Dockerfile sets it
  (`Dockerfile:34`); for the native runtime add it as an env var.

---

## 6. Environment variables

Use an **environment group** so the web service and worker share one source of
truth (`https://getvoroa.com/docs/environment-groups/`): "A group belongs to a
workspace. Any service in that workspace can be linked to it." Values are
"encrypted when you save them and are never shown again - not in the dashboard,
not through the API."

**Practical warning:** because a saved value can never be read back, you must
record `NEXTAUTH_SECRET`, `CRON_SECRET` and `ENCRYPTION_KEY` in your own password
manager before saving. You cannot retrieve them from Voroa afterwards.

| Variable | Web | Worker | Note |
|---|---|---|---|
| `NODE_ENV` | `production` | `production` | |
| `DATABASE_URL` | yes | yes | must be identical |
| `REDIS_URL` | yes | yes | must be identical |
| `NEXTAUTH_URL` | yes | yes | public HTTPS URL; set after first deploy |
| `NEXTAUTH_SECRET` | yes | yes | identical |
| `CRON_SECRET` | yes | yes | identical |
| `ENCRYPTION_KEY` | yes | yes | **identical 32-byte hex**, or every DM send fails to decrypt |
| `META_GRAPH_API_VERSION` | yes | yes | `v25.0` |
| `INSTAGRAM_APP_ID` | yes | yes | |
| `INSTAGRAM_APP_SECRET` | yes | yes | |
| `FACEBOOK_APP_SECRET` | yes | yes | |
| `RESEND_API_KEY` | yes | — | |
| `EMAIL_FROM` | yes | — | must match a verified Resend domain |
| `ALLOWED_EMAILS` | optional | — | strongly recommended on a public URL |
| `WEBHOOK_VERIFY_TOKEN` | yes | — | |
| `CRON_BASE_URL` | — | yes | scheduled tasks run inside the worker, so point at the web service's public URL |
| `COMMENT_POLL_INTERVAL_MS` | — | optional | default `300000` |
| `COMMENT_POLL_LOOKBACK_HOURS` | — | optional | default `72` |
| `COMMENT_POLL_MAX_PER_SWEEP` | — | optional | default `30` |

`ENCRYPTION_KEY` and `REDIS_URL`/`DATABASE_URL` must match across both services —
`docs/stack.md:36-38`:

> "The web app and the worker must share the same `DATABASE_URL`, `REDIS_URL`, and
> `ENCRYPTION_KEY`. The web app stores the encrypted Instagram token; the worker
> decrypts it to send. Different keys mean every send fails to decrypt."

Two operational notes:

- `tsx --env-file-if-exists=.env` in the `worker` script is harmless on Voroa —
  there is no `.env` file, so the flag is a no-op and real variables come from the
  platform.
- `NEXT_PUBLIC_*` variables would need the per-variable **Build time** tick.
  CheckDM declares none.

---

## 7. Deployment order

1. Confirm §5.1 (Redis/BullMQ) and §5.2 (devDependencies) with Voroa support.
2. Create the free Postgres and Key Value. Capture both URLs and the eviction
   policy setting.
3. Deploy the **Background Worker** first: build `npm install && npm run
   db:generate`, start `npm run worker`, env vars set. Confirm it reports
   **Live** (one full minute up) rather than "Failed to start".
4. Run migrations **from your machine** against the Postgres URL:
   `DATABASE_URL="<url>" npm run db:migrate`. Do not attempt them in a build step.
5. Deploy the **Web Service**. Set `NEXTAUTH_URL` to the Voroa HTTPS URL.
6. Attach the two **Scheduled Tasks** to the worker.
7. Verify `https://<service>.getvoroa.com/api/health` reports database, Redis,
   queue and worker heartbeat all OK.
8. Configure Meta / Zernio against the final URL last.

Public endpoints after deployment (`docs/deploy-render.md:73-83`):

- Instagram OAuth callback — `https://<domain>/api/instagram/callback`
- Meta webhook — `https://<domain>/api/webhook`
- Zernio webhook — `https://<domain>/api/zernio/webhook/<workspaceId>`

---

## 8. Cost

| Item | Plan | Monthly |
|---|---|---|
| Workspace | Free | ₹0 |
| Web service | Nano, 512 MB | ₹0 |
| Background worker | Nano, 512 MB | ₹0 |
| PostgreSQL | DB Nano, 1 GB, 100 conn | ₹0 |
| Key Value | Cache Nano, 128 MB | ₹0 |
| Scheduled tasks (2) | included | ₹0 |
| Bandwidth | 5 GB included | ₹0 |
| **Total** | | **₹0 / no card required** |

Escalation costs if the free size is insufficient: Starter web/worker
₹298 + 18% GST each; `kv_starter` (256 MB) ₹425 + GST; `db_starter` ₹299 + GST.

Data residency: Mumbai and Bangalore, India. Relevant if any Meta webhook or
Instagram API traffic is latency-sensitive, and relevant to any data-residency
requirement.

---

## 9. Recommendation

**CONDITIONAL GO.** Voroa is a materially better fit than Catalyst and the only
platform examined so far that satisfies all three hard requirements. But do not
deploy until §5.1 is answered, because an unverifiable Redis is the one thing that
would invalidate the whole design.

Ranked next actions:

1. **Ask Voroa support** whether Key Value supports `EVALSHA`/`EVAL`, blocking
   pops, and `MULTI`/`EXEC`. This is the deciding question.
2. **Use the Docker runtime** for web and worker — removes the `tsx`/`prisma`
   devDependency unknown without touching application code.
3. **Pin Node 22** and verify the resolved patch is ≥ 22.12 in the first build log.
4. **Confirm the 128 MB Key Value is adequate** for your monthly job volume
   before real traffic.
5. **Accept the IST cron timezone**, or move `refresh-tokens` /
   `snapshot-followers` back to an external scheduler (Render cron jobs, GitHub
   Actions, or an external cron service) where UTC is available.
6. **Take manual Postgres backups** — the free tier has none.

If step 1 fails, keep the worker on Render/Railway/Fly and use Voroa only for the
web tier; that hybrid still beats the Catalyst option, because the two blockers
Catalyst could not solve (the always-on worker and native Redis) are then
resolved off-platform.

---

## 10. Sources

- Free tier limits — https://getvoroa.com/docs/free-instances/
- Idle sleep (not available) — https://getvoroa.com/docs/idle-sleep/
- Background workers / BullMQ — https://getvoroa.com/background-workers/
- Background worker docs — https://getvoroa.com/docs/deploy-background-worker/
- Worker vs cron — https://getvoroa.com/docs/worker-or-cron-job/
- Scheduled tasks & cron, IST timezone — https://getvoroa.com/docs/scheduled-tasks-cron/
- Build & start commands — https://getvoroa.com/docs/build-and-start-commands/
- Build pipeline — https://getvoroa.com/docs/build-pipeline/
- Node.js quickstart, versions 22/20/18 — https://getvoroa.com/docs/deploy-nodejs/
- Next.js quickstart — https://getvoroa.com/docs/deploy-nextjs/
- Health checks — https://getvoroa.com/docs/health-checks/
- Environment variables — https://getvoroa.com/docs/environment-variables/
- Environment groups — https://getvoroa.com/docs/environment-groups/
- Managed Postgres — https://getvoroa.com/managed-postgresql-india/ , https://getvoroa.com/docs/managed-databases/
- Connection pooling — https://getvoroa.com/docs/postgresql-connection-pooling/
- Database storage limits — https://getvoroa.com/docs/database-storage-limits/
- Managed Key Value — https://getvoroa.com/managed-redis-india/ , https://getvoroa.com/docs/key-value/
- Service stopped by Voroa — https://getvoroa.com/docs/service-stopped-by-voroa/
- Pricing — https://getvoroa.com/pricing/