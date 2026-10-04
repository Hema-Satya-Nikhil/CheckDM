/**
 * Self-authored event detection.
 *
 * Instagram providers report the author of a comment in different id spaces:
 *
 *   - Meta's Graph webhooks put the author's IGSID in `from.id`, which is the
 *     same value as the connected account's `entry.id`.
 *   - Zernio uses its own per-actor id in `from.id`. It matches neither the
 *     connected account's `instagramId` nor its `platformUserId`, so an
 *     id-only comparison silently lets the account's own events through.
 *
 * A username match closes that gap: Instagram usernames are globally unique, so
 * an author whose handle equals the connected account's handle is that account.
 *
 * The guard is deliberately evaluated during ingestion — before campaign
 * matching, before a queue job is created, and therefore before any delivery
 * claim or provider send can happen. That keeps it correct even when a campaign
 * matches every comment (`matchAnyWord`), where the keyword matcher offers no
 * protection at all.
 */

function normalizeUsername(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/^@+/, "").toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

export function isSelfAuthoredComment({
  commenterId,
  commenterName,
  selfInstagramId,
  selfUsername,
}: {
  commenterId?: string | null;
  commenterName?: string | null;
  selfInstagramId?: string | null;
  selfUsername?: string | null;
}): boolean {
  if (commenterId && selfInstagramId && commenterId === selfInstagramId) {
    return true;
  }

  const author = normalizeUsername(commenterName);
  const self = normalizeUsername(selfUsername);
  return Boolean(author && self && author === self);
}