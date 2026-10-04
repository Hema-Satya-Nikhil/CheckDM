/**
 * Self-reply guard — worker-level enforcement.
 *
 * `__tests__/self-reply-guard.test.ts` pins the guard at the two ingestion
 * paths. This file pins the *worker* check, which is the last boundary before
 * campaign matching, a durable delivery claim and a provider send.
 *
 * The worker check exists because a queue job is not a trustworthy boundary:
 * anything already in Redis from before the guard shipped, or added by a future
 * path that forgets to filter, arrives here with no protection left. A
 * `matchAnyWord` campaign matches every comment, so the keyword matcher offers
 * no backstop at all.
 *
 * This is not hypothetical. Against the real Zernio feed the account's own
 * public replies return as inbound comment events — 16 of the 20 most recent
 * stored payloads — and before the guard existed they produced 43 DMs addressed
 * to the account itself in a single one-minute burst.
 *
 * Identity facts below are the real ones observed in production, because the
 * whole reason a username comparison is needed is that Zernio does not report
 * authors in the connected account's id space:
 *
 *   entry.id (connected account) = 29512567691664692  == InstagramAccount.instagramId
 *   self author id (Zernio)      = 17841425656123274  != 29512567691664692
 *   self author username         = nikhilainavalli.tech
 *   external commenter id        = 1119433663758347, username unknown_person_nikhil
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "node:crypto";

const {
  mockPrisma,
  mockSendPrivateReply,
  mockSendPrivateReplyWithLinkButton,
  mockSendPrivateReplyWithButton,
  mockSendCommentReply,
  mockSendDirectMessage,
  mockSendDirectMessageWithButton,
  mockSendDirectMessageWithLinkButton,
  mockGetUserFollowStatus,
  mockMatchKeywords,
  mockReserveDMSlot,
  mockReleaseDMSlot,
  mockReserveWorkspaceDMSend,
  mockReleaseWorkspaceDMReservation,
  mockQueueAdd,
} = vi.hoisted(() => ({
  mockPrisma: {
    automation: { findMany: vi.fn(), findFirst: vi.fn() },
    instagramAccount: { findUnique: vi.fn() },
    dmLog: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    commentDelivery: { create: vi.fn(), delete: vi.fn() },
    postbackDelivery: { create: vi.fn(), delete: vi.fn() },
    zernioConnection: { findUnique: vi.fn() },
    operationalEvent: { create: vi.fn() },
  },
  mockSendPrivateReply: vi.fn(),
  mockSendPrivateReplyWithLinkButton: vi.fn(),
  mockSendPrivateReplyWithButton: vi.fn(),
  mockSendCommentReply: vi.fn(),
  mockSendDirectMessage: vi.fn(),
  mockSendDirectMessageWithButton: vi.fn(),
  mockSendDirectMessageWithLinkButton: vi.fn(),
  mockGetUserFollowStatus: vi.fn(),
  mockMatchKeywords: vi.fn(),
  mockReserveDMSlot: vi.fn(),
  mockReleaseDMSlot: vi.fn(),
  mockReserveWorkspaceDMSend: vi.fn(),
  mockReleaseWorkspaceDMReservation: vi.fn(),
  mockQueueAdd: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({ prisma: mockPrisma }));

vi.mock("@/lib/meta/client", () => ({
  sendPrivateReply: mockSendPrivateReply,
  sendPrivateReplyWithLinkButton: mockSendPrivateReplyWithLinkButton,
  sendPrivateReplyWithButton: mockSendPrivateReplyWithButton,
  sendCommentReply: mockSendCommentReply,
  sendDirectMessage: mockSendDirectMessage,
  sendDirectMessageWithButton: mockSendDirectMessageWithButton,
  sendDirectMessageWithLinkButton: mockSendDirectMessageWithLinkButton,
  getUserFollowStatus: mockGetUserFollowStatus,
  MetaApiError: class MetaApiError extends Error {
    code: number;
    constructor(code: number, _s?: number, _t?: string, message?: string) {
      super(message);
      this.code = code;
      this.name = "MetaApiError";
    }
  },
  TokenExpiredError: class TokenExpiredError extends Error {
    name = "TokenExpiredError";
  },
  RateLimitError: class RateLimitError extends Error {
    name = "RateLimitError";
  },
}));

vi.mock("@/lib/instagram/provider", () => ({
  MetaApiError: class MetaApiError extends Error {
    code: number;
    constructor(code: number, _s?: number, _t?: string, message?: string) {
      super(message);
      this.code = code;
      this.name = "MetaApiError";
    }
  },
  RateLimitError: class RateLimitError extends Error {
    name = "RateLimitError";
  },
  TokenExpiredError: class TokenExpiredError extends Error {
    name = "TokenExpiredError";
  },
  getUserFollowStatus: mockGetUserFollowStatus,
  sendCommentReply: mockSendCommentReply,
  sendDirectMessage: mockSendDirectMessage,
  sendDirectMessageWithButton: mockSendDirectMessageWithButton,
  sendDirectMessageWithLinkButton: mockSendDirectMessageWithLinkButton,
  sendPrivateReply: mockSendPrivateReply,
  sendPrivateReplyWithButton: mockSendPrivateReplyWithButton,
  sendPrivateReplyWithLinkButton: mockSendPrivateReplyWithLinkButton,
  hasInstagramCredentials: () => true,
  createInstagramContext: () =>
    Promise.resolve({ provider: "ZERNIO", connectionId: "conn_1" }),
}));

vi.mock("@/lib/utils/keyword-matcher", () => ({
  matchKeywords: mockMatchKeywords,
}));
vi.mock("@/lib/utils/rate-limiter", () => ({
  reserveDMSlot: mockReserveDMSlot,
  releaseDMSlot: mockReleaseDMSlot,
}));
vi.mock("@/lib/billing/usage", () => ({
  reserveWorkspaceDMSend: mockReserveWorkspaceDMSend,
  releaseWorkspaceDMReservation: mockReleaseWorkspaceDMReservation,
}));
vi.mock("@/lib/ops/worker-health", () => ({ recordWorkerAlert: vi.fn() }));
vi.mock("@/lib/queue/client", () => ({
  getDMQueue: () => ({ add: mockQueueAdd }),
  getRedisConnection: vi.fn(),
  POSTBACK_JOB_NAME: "process-postback",
  FOLLOWUP_JOB_NAME: "process-followup",
  MESSAGE_JOB_NAME: "process-message",
}));
vi.mock("@/lib/zernio/client", () => ({
  ZernioApiError: class ZernioApiError extends Error {
    code: number;
    constructor(message: string, code = 500) {
      super(message);
      this.code = code;
      this.name = "ZernioApiError";
    }
  },
  ZernioDeliveryUnconfirmedError: class ZernioDeliveryUnconfirmedError extends Error {
    name = "ZernioDeliveryUnconfirmedError";
  },
}));
vi.mock("bullmq", () => {
  function MockWorker(_name: string, processor: unknown) {
    (global as Record<string, unknown>).__processor = processor;
    return { on: vi.fn(), close: vi.fn() };
  }
  return {
    Worker: MockWorker,
    UnrecoverableError: class UnrecoverableError extends Error {
      name = "UnrecoverableError";
    },
  };
});

import { createDMWorker } from "@/lib/queue/dm-worker";
import { verifyZernioSignature } from "@/lib/zernio/normalize-event";

// Real production identities.
const SELF_IGSID = "29512567691664692";
const SELF_USERNAME = "nikhilainavalli.tech";
const ZERNIO_SELF_AUTHOR_ID = "17841425656123274";
const EXTERNAL_AUTHOR_ID = "1119433663758347";
const EXTERNAL_USERNAME = "unknown_person_nikhil";

// A second connected account, used to prove guards do not leak across accounts.
const OTHER_IGSID = "999888777666555";
const OTHER_USERNAME = "brand.two";

type Processor = (job: {
  name?: string;
  data: Record<string, unknown>;
  id: string;
  attemptsMade: number;
}) => Promise<void>;

function getProcessor(): Processor {
  createDMWorker();
  return (global as Record<string, unknown>).__processor as Processor;
}

function makeJob(overrides: Record<string, unknown> = {}) {
  return {
    name: "process-comment",
    data: {
      instagramAccountId: SELF_IGSID,
      accountConnectionId: "row_self",
      commentId: "comment_1",
      commentText: "LINK please",
      commenterId: EXTERNAL_AUTHOR_ID,
      commenterName: EXTERNAL_USERNAME,
      mediaId: "media_1",
      source: "WEBHOOK",
      ...overrides,
    },
    id: "job_1",
    attemptsMade: 0,
  };
}

function makeAutomation(overrides: Record<string, unknown> = {}) {
  return {
    id: "auto_1",
    workspaceId: "ws_1",
    instagramAccountId: "row_self",
    postId: "media_1",
    keywords: ["LINK"],
    dmMessage: "Here is your link",
    isActive: true,
    wholeWordMatch: true,
    matchAnyPost: false,
    matchAnyWord: false,
    openingDmEnabled: false,
    openingDmMessage: null,
    openingDmButtonLabel: null,
    linkButtonLabel: null,
    followPromptMessage: null,
    followPromptButtonLabel: null,
    publicReplyEnabled: false,
    publicReplyMessage: null,
    publicReplyMessages: [],
    followUpEnabled: false,
    followUpMessage: null,
    followUpDelayMinutes: null,
    requireFollow: false,
    instagramAccount: {
      id: "row_self",
      instagramId: SELF_IGSID,
      username: SELF_USERNAME,
      accessToken: "encrypted",
    },
    workspace: { id: "ws_1" },
    trackedLinks: [],
    ...overrides,
  };
}

/** Assert that nothing at all was sent and no claim was taken. */
function expectNoSideEffects() {
  expect(mockSendPrivateReply).not.toHaveBeenCalled();
  expect(mockSendPrivateReplyWithLinkButton).not.toHaveBeenCalled();
  expect(mockSendPrivateReplyWithButton).not.toHaveBeenCalled();
  expect(mockSendCommentReply).not.toHaveBeenCalled();
  expect(mockSendDirectMessage).not.toHaveBeenCalled();
  expect(mockSendDirectMessageWithButton).not.toHaveBeenCalled();
  expect(mockSendDirectMessageWithLinkButton).not.toHaveBeenCalled();
  expect(mockPrisma.commentDelivery.create).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();

  // The connected account, as the worker's identity lookup sees it.
  mockPrisma.instagramAccount.findUnique.mockResolvedValue({
    instagramId: SELF_IGSID,
    username: SELF_USERNAME,
  });

  // No existing log, so a job that is allowed through reaches the send path.
  mockPrisma.dmLog.findUnique.mockResolvedValue(null);
  mockPrisma.dmLog.findFirst.mockResolvedValue(null);
  mockPrisma.dmLog.create.mockResolvedValue({});
  mockPrisma.dmLog.update.mockResolvedValue({});
  mockPrisma.dmLog.upsert.mockResolvedValue({});
  mockPrisma.commentDelivery.create.mockResolvedValue({});
  mockPrisma.commentDelivery.delete.mockResolvedValue({});

  mockPrisma.automation.findMany.mockResolvedValue([makeAutomation()]);
  mockMatchKeywords.mockReturnValue({ matched: true, matchedKeyword: "LINK" });
  mockReserveDMSlot.mockResolvedValue({ allowed: true, reserved: true });
  mockReserveWorkspaceDMSend.mockResolvedValue({
    allowed: true,
    periodStart: new Date("2026-05-01"),
  });
  mockGetUserFollowStatus.mockResolvedValue(true);
  mockSendPrivateReply.mockResolvedValue({});
});

describe("worker rejects self-authored comments", () => {
  it("1. ignores a self-authored event before the matcher runs", async () => {
    // Real Zernio echo: author id is in a different id space, so only the
    // username can catch it.
    await getProcessor()(
      makeJob({
        commenterId: ZERNIO_SELF_AUTHOR_ID,
        commenterName: SELF_USERNAME,
        commentText: "Check it has send.",
      }),
    );

    expect(mockMatchKeywords).not.toHaveBeenCalled();
    expect(mockPrisma.automation.findMany).not.toHaveBeenCalled();
    expectNoSideEffects();
  });

  it("2. creates no job-side effect even when the campaign matches every word", async () => {
    // matchAnyWord is the dangerous configuration: the keyword matcher would
    // match any text at all, so the identity guard is the only thing standing
    // between an echo and a send.
    mockPrisma.automation.findMany.mockResolvedValue([
      makeAutomation({ matchAnyWord: true, keywords: [] }),
    ]);

    await getProcessor()(
      makeJob({
        commenterId: ZERNIO_SELF_AUTHOR_ID,
        commenterName: SELF_USERNAME,
        commentText: "anything at all",
      }),
    );

    expect(mockMatchKeywords).not.toHaveBeenCalled();
    expectNoSideEffects();
  });

  it("3. takes no durable delivery claim", async () => {
    await getProcessor()(
      makeJob({
        commenterId: ZERNIO_SELF_AUTHOR_ID,
        commenterName: SELF_USERNAME,
      }),
    );

    expect(mockPrisma.commentDelivery.create).not.toHaveBeenCalled();
  });

  it("4. causes no provider send of any kind", async () => {
    // Public reply and DM both enabled, so an unguarded job would send twice.
    mockPrisma.automation.findMany.mockResolvedValue([
      makeAutomation({
        publicReplyEnabled: true,
        publicReplyMessage: "Thanks!",
        matchAnyWord: true,
      }),
    ]);

    await getProcessor()(
      makeJob({
        commenterId: ZERNIO_SELF_AUTHOR_ID,
        commenterName: SELF_USERNAME,
      }),
    );

    expectNoSideEffects();
  });

  it("5. a duplicate self-authored job also does nothing (idempotent)", async () => {
    const job = makeJob({
      commentId: "comment_echo",
      commenterId: ZERNIO_SELF_AUTHOR_ID,
      commenterName: SELF_USERNAME,
    });
    const process = getProcessor();

    await process(job);
    await process(job);
    await process(job);

    expect(mockPrisma.automation.findMany).not.toHaveBeenCalled();
    expectNoSideEffects();
  });
});

describe("worker still serves external commenters", () => {
  it("6. an external matching comment is matched, claimed and sent", async () => {
    await getProcessor()(makeJob());

    expect(mockMatchKeywords).toHaveBeenCalled();
    expect(mockPrisma.commentDelivery.create).toHaveBeenCalledWith({
      data: { automationId: "auto_1", commentId: "comment_1", leg: "private-reply" },
    });
    expect(mockSendPrivateReply).toHaveBeenCalledTimes(1);
    expect(mockPrisma.dmLog.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "SENT" }) }),
    );
  });

  it("7. an external non-matching comment is not sent", async () => {
    mockMatchKeywords.mockReturnValue({ matched: false, matchedKeyword: null });

    await getProcessor()(makeJob({ commentText: "just saying hello" }));

    expect(mockPrisma.commentDelivery.create).not.toHaveBeenCalled();
    expectNoSideEffects();
  });

  it("8. does not leak across connected Instagram accounts", async () => {
    // A comment authored by account A must still be served normally when it
    // arrives on account B, even though A's username is hardcoded in this test.
    mockPrisma.instagramAccount.findUnique.mockResolvedValue({
      instagramId: OTHER_IGSID,
      username: OTHER_USERNAME,
    });
    mockPrisma.automation.findMany.mockResolvedValue([
      makeAutomation({
        instagramAccount: {
          id: "row_other",
          instagramId: OTHER_IGSID,
          username: OTHER_USERNAME,
          accessToken: "encrypted",
        },
      }),
    ]);

    // Authored by the *other* account — not self relative to account B.
    await getProcessor()(
      makeJob({
        instagramAccountId: OTHER_IGSID,
        accountConnectionId: "row_other",
        commenterId: SELF_IGSID,
        commenterName: SELF_USERNAME,
      }),
    );

    expect(mockSendPrivateReply).toHaveBeenCalledTimes(1);

    // And the same author on their own account is still rejected.
    vi.clearAllMocks();
    mockPrisma.instagramAccount.findUnique.mockResolvedValue({
      instagramId: SELF_IGSID,
      username: SELF_USERNAME,
    });
    mockPrisma.commentDelivery.create.mockResolvedValue({});
    mockPrisma.dmLog.findUnique.mockResolvedValue(null);

    await getProcessor()(
      makeJob({
        commenterId: ZERNIO_SELF_AUTHOR_ID,
        commenterName: SELF_USERNAME,
      }),
    );

    expectNoSideEffects();
  });

  it("9. falls open (does not drop real customers) on ambiguous identity", async () => {
    // Documented fallback: when the provider gives no usable identity we cannot
    // prove the event is ours, so it is treated as external and served. Dropping
    // real customers would be worse than the small residual risk, because the
    // durable delivery claim and the one-private-reply-per-comment limit still
    // bound the damage.
    mockPrisma.instagramAccount.findUnique.mockResolvedValue({
      instagramId: SELF_IGSID,
      username: SELF_USERNAME,
    });

    await getProcessor()(
      makeJob({ commenterId: undefined, commenterName: undefined }),
    );

    expect(mockSendPrivateReply).toHaveBeenCalledTimes(1);
  });
});

describe("webhook signature validation is unaffected", () => {
  const secret = "workspace_webhook_secret";

  it("10. still accepts only a correctly signed exact body", () => {
    const rawBody = JSON.stringify({ event: "comment.received" });
    const signature = createHmac("sha256", secret).update(rawBody).digest("hex");

    expect(verifyZernioSignature({ rawBody, signature, secret })).toBe(true);
    // A single trailing byte changes the body, so the same signature fails.
    expect(verifyZernioSignature({ rawBody: `${rawBody} `, signature, secret })).toBe(
      false,
    );
    // Another workspace's secret must not validate.
    expect(
      verifyZernioSignature({ rawBody, signature, secret: "other-secret" }),
    ).toBe(false);
    // No signature header is rejected.
    expect(verifyZernioSignature({ rawBody, signature: null, secret })).toBe(false);
    // Malformed signature is rejected rather than throwing.
    expect(verifyZernioSignature({ rawBody, signature: "not-hex", secret })).toBe(
      false,
    );
  });
});
