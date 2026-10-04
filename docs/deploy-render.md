# Render deployment preparation

This repository includes a [`render.yaml`](../render.yaml) Blueprint for the
first hosted CheckDM deployment. It describes the web service, always-on
BullMQ worker, three Render Cron Jobs, Render Postgres, and Render Key Value.
It contains no secret values.

## Commands

| Service | Build | Start / command |
| --- | --- | --- |
| Web | `npm run build` | `npm run db:migrate && npm run start` |
| Worker | `npm run db:generate` | `npm run worker` |
| Attach-next-reel cron | `npm run db:generate` | `node scripts/render-cron.mjs attach-next-reel` |
| Refresh-tokens cron | `npm run db:generate` | `node scripts/render-cron.mjs refresh-tokens` |
| Snapshot-followers cron | `npm run db:generate` | `node scripts/render-cron.mjs snapshot-followers` |

The web service uses `/api/health` as its health check. That endpoint checks
Postgres, Redis, queue access, and the worker heartbeat, so it becomes healthy
after the worker has started and sent its first heartbeat.

The existing `scripts/cron.sh` is a long-running scheduler intended for a
container. Render Cron Jobs are finite jobs, so the Blueprint uses the small
`scripts/render-cron.mjs` wrapper to call the existing authenticated cron
routes once. The schedules preserve the existing design: attach-next-reel
every five minutes, refresh-tokens daily at 05:00 UTC, and snapshot-followers
daily at 07:00 UTC.

## Environment variables

The Blueprint generates `NEXTAUTH_SECRET` and `CRON_SECRET` in Render and
shares them with the worker and cron jobs. Set `ENCRYPTION_KEY` manually to the
same 64-character hexadecimal value on the web service; the worker receives it
from the web service. Set `NEXTAUTH_URL` manually to the final hosted HTTPS
URL after assigning the web service domain. Do not use the local ngrok URL.

Required shared values are `DATABASE_URL` (Render Postgres), `REDIS_URL`
(Render Key Value), `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `CRON_SECRET`, and
`ENCRYPTION_KEY`.

Web and worker email/provider variables are `RESEND_API_KEY`, `EMAIL_FROM`,
and optionally `ALLOWED_EMAILS` or `EMAIL_SERVER`. Direct Meta connections also
require `META_GRAPH_API_VERSION`, `INSTAGRAM_APP_ID`,
`INSTAGRAM_APP_SECRET`, `FACEBOOK_APP_SECRET`, and
`WEBHOOK_VERIFY_TOKEN`. Zernio credentials are stored through the application
Settings flow, not as environment variables. Worker polling knobs are
optional: `COMMENT_POLL_INTERVAL_MS`, `COMMENT_POLL_LOOKBACK_HOURS`, and
`COMMENT_POLL_MAX_PER_SWEEP`.

Cron jobs need the web URL plus `CRON_SECRET` (and the fallback
`NEXTAUTH_SECRET`) to call the existing routes. The Blueprint wires those
values from the web service.

Local-only values such as `DATABASE_URL` pointing at `127.0.0.1`,
`REDIS_URL` pointing at localhost, and any local tunnel URL must not be copied
to Render. The local `.env` remains unchanged.

## Production database sequence

1. Create the Render Postgres and Key Value resources from the Blueprint.
2. Set the production secrets and final `NEXTAUTH_URL` in Render.
3. Let the web start command run `prisma migrate deploy` against the hosted
   `DATABASE_URL`.
4. Confirm `/api/health` is healthy and the worker heartbeat is present.
5. Configure Meta or Zernio against the final URL.

No migration, seed, or data copy should be run against the local database as
part of deployment preparation. A pre-deployment PostgreSQL backup was taken
before the auth/report fixes; it lives outside this repository, in the local
infrastructure directory, and is deliberately not committed here.

## External configuration after deployment

The production Zernio webhook endpoint will be:

`https://YOUR-CHECKDM-DOMAIN/api/zernio/webhook/<workspaceId>`

The direct Meta webhook endpoint, when used, is:

`https://YOUR-CHECKDM-DOMAIN/api/webhook`

The Instagram OAuth callback is:

`https://YOUR-CHECKDM-DOMAIN/api/instagram/callback`

Do not register or change an external webhook until the final Render domain
and production secrets are configured. Resend production sending requires a
verified sending domain and a matching `EMAIL_FROM`; the current testing
sender restrictions still apply until that is done.

