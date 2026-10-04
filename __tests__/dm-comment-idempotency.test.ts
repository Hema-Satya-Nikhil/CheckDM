/**
 * Durable comment-delivery claims.
 *
 * The public-reply and private-reply legs of one comment are each guarded by a
 * row in CommentDelivery whose composite primary key is
 * (automationId, commentId, leg). These tests cover the guarantee that one
 * qualifying comment produces at most one outbound action per campaign, however
 * many times it is delivered or how many workers race.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockPrisma,
  mockSendCommentReply,
  mockSendPrivateReply,
  mockDecryptToken,
  mockMatchKeywords,
  mockReserveDMSlot,
  mockReleaseDMSlot,
  mockQueueAdd,
  mockReserveWorkspaceDMSend,
  mockReleaseWorkspaceDMReservation,
} = vi.hoisted(() => ({
  mockPrisma: {
    zernioConnection: { findUnique: vi.fn() },
    commentDelivery: { create: vi.fn(), delete: vi.fn() },
    dmLog: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    automation: { findMany: vi.fn(), findFirst: vi.fn() },
    instagramAccount: { findUnique: vi.fn() },
    operationalEvent: { create: vi.fn() },
  },
  mockSendCommentReply: vi.fn(),
  mockSendPrivateReply: vi.fn(),
  mockDecryptToken: vi.fn(),
  mockMatchKeywords: vi.fn(),
  mockReserveDMSlot: vi.fn(),
  mockReleaseDMSlot: vi.fn(),
  mockQueueAdd: vi.fn(),
  mockReserveWorkspaceDMSend: vi.fn(),
  mockReleaseWorkspaceDMReservation: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({ prisma: mockPrisma }));

vi.mock("@/lib/meta/client", () => ({
  sendCommentReply: mockSendCommentReply,
  sendPrivateReply: mockSendPrivateReply,
  sendPrivateReplyWithLinkButton: vi.fn(),
  sendPrivateReplyWithButton: vi.fn(),
  getUserFollowStatus: vi.fn().mockResolvedValue(true),
  sendDirectMessageWithButton: vi.fn(),
  sendDirectMessage: vi.fn(),
  sendDirectMessageWithLinkButton: vi.fn(),
  MetaApiError: class MetaApiError extends Error {
    code: number;
    constructor(code: number) {
      super(`meta ${code}`);
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

vi.mock("@/lib/meta/oauth", () => ({ decryptToken: mockDecryptToken }));
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

vi.mock("bullmq", () => {
  function MockWorker(_name: string, processor: unknown) {
    (global as Record<string, unknown>).__proc = processor;
    return { on: vi.fn(), close: vi.fn() };
  }
  return {
    Worker: MockWorker,
    UnrecoverableError: class UnrecoverableError extends Error {
      name = "UnrecoverableError";
    },
  };
});

import { createDMWorker } from "../lib/queue/dm-worker";

const usagePeriodStart = new Date("2026-05-01T00:00:00.000Z");

function automation(overrides: Record<string, unknown> = {}) {
  return {
    id: "auto_1",
    workspaceId: "ws_1",
    instagramAccountId: "ig_row_1",
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
    publicReplyEnabled: true,
    publicReplyMessage: "Thanks for commenting!",
    publicReplyMessages: [],
    instagramAccount: {
      id: "ig_row_1",
      instagramId: "ig_1",
      accessToken: "enc_token",
    },
    workspace: { id: "ws_1" },
    trackedLinks: [],
    ...overrides,
  };
}

const jobData = {
  instagramAccountId: "ig_1",
  commentId: "comment_1",
  commentText: "LINK please",
  commenterId: "user_1",
  commenterName: "someone",
  mediaId: "media_1",
};

function processor() {
  createDMWorker();
  return (global as Record<string, unknown>).__proc as (job: {
    data: Record<string, unknown>;
    id: string;
    attemptsMade: number;
  }) => Promise<void>;
}

function job(data: Record<string, unknown> = {}, id = "job_1", attemptsMade = 0) {
  return { data: { ...jobData, ...data }, id, attemptsMade };
}

/**
 * A faithful stand-in for the CommentDelivery primary key: the first INSERT for
 * a given (automation, comment, leg) wins, every later one is a P2002. This is
 * what the real database guarantees.
 */
function installClaimStore() {
  const claims = new Set<string>();
  mockPrisma.commentDelivery.create.mockImplementation(
    async ({ data }: { data: { automationId: string; commentId: string; leg: string } }) => {
      const key = `${data.automationId}|${data.commentId}|${data.leg}`;
      if (claims.has(key)) throw { code: "P2002" };
      claims.add(key);
      return data;
    },
  );
  mockPrisma.commentDelivery.delete.mockImplementation(
    async ({ where }: { where: { automationId_commentId_leg: { automationId: string; commentId: string; leg: string } } }) => {
      const { automationId, commentId, leg } = where.automationId_commentId_leg;
      claims.delete(`${automationId}|${commentId}|${leg}`);
      return {};
    },
  );
  return claims;
}

beforeEach(() => {
  vi.clearAllMocks();
  installClaimStore();

  mockPrisma.automation.findMany.mockResolvedValue([automation()]);
  mockPrisma.automation.findFirst.mockResolvedValue(null);
  // No prior row: both legs look outstanding, which is exactly the window the
  // race used to exploit.
  mockPrisma.dmLog.findUnique.mockResolvedValue(null);
  mockPrisma.dmLog.findFirst.mockImplementation(
    async (args: { where?: { status?: string } } = {}) =>
      args.where?.status === "SENT" ? null : { commenterName: "someone" },
  );
  mockPrisma.dmLog.create.mockResolvedValue({});
  mockPrisma.dmLog.update.mockResolvedValue({});
  mockPrisma.dmLog.upsert.mockResolvedValue({});
  mockPrisma.instagramAccount.findUnique.mockResolvedValue({ workspaceId: "ws_1" });
  mockPrisma.operationalEvent.create.mockResolvedValue({});
  mockDecryptToken.mockReturnValue("token");
  mockMatchKeywords.mockReturnValue({ matched: true, matchedKeyword: "LINK" });
  mockReserveWorkspaceDMSend.mockResolvedValue({
    allowed: true,
    reserved: true,
    remaining: 100,
    limit: 2000,
    periodStart: usagePeriodStart,
  });
  mockReleaseWorkspaceDMReservation.mockResolvedValue({ count: 1 });
  mockReserveDMSlot.mockResolvedValue({
    allowed: true,
    currentCount: 1,
    remainingDMs: 179,
    shouldRequeue: false,
    requeueDelayMs: 0,
    shouldSkip: false,
    reserved: true,
  });
  mockReleaseDMSlot.mockResolvedValue(0);
  mockSendCommentReply.mockResolvedValue({ id: "reply_1" });
  mockSendPrivateReply.mockResolvedValue({ message_id: "dm_1" });
});

describe("A. one comment, one send", () => {
  it("sends exactly one public reply and one DM", async () => {
    await processor()(job());

    expect(mockSendCommentReply).toHaveBeenCalledTimes(1);
    expect(mockSendPrivateReply).toHaveBeenCalledTimes(1);
  });

  it("claims both legs under the campaign's own comment scope", async () => {
    await processor()(job());

    expect(mockPrisma.commentDelivery.create).toHaveBeenCalledWith({
      data: { automationId: "auto_1", commentId: "comment_1", leg: "public-reply" },
    });
    expect(mockPrisma.commentDelivery.create).toHaveBeenCalledWith({
      data: { automationId: "auto_1", commentId: "comment_1", leg: "private-reply" },
    });
  });
});

describe("B. duplicate webhook delivery", () => {
  it("does not send a second reply when the same delivery arrives twice", async () => {
    const process = processor();
    await process(job());
    await process(job({}, "job_duplicate_delivery"));

    expect(mockSendCommentReply).toHaveBeenCalledTimes(1);
    expect(mockSendPrivateReply).toHaveBeenCalledTimes(1);
  });
});

describe("C. duplicate queue job", () => {
  it("treats a second job for the same comment as already processed", async () => {
    const process = processor();
    await process(job({}, "job_original"));
    // Same logical job re-delivered under a different BullMQ id.
    await process(job({}, "job_requeued"));

    expect(mockSendCommentReply).toHaveBeenCalledTimes(1);
    expect(mockSendPrivateReply).toHaveBeenCalledTimes(1);
  });
});

describe("D. two concurrent workers", () => {
  it("lets only one of two racing workers perform the external send", async () => {
    const process = processor();

    await Promise.all([process(job({}, "worker_a")), process(job({}, "worker_b"))]);

    // The whole point: both read "not sent yet", but only one can win the claim.
    expect(mockSendCommentReply).toHaveBeenCalledTimes(1);
    expect(mockSendPrivateReply).toHaveBeenCalledTimes(1);
  });

  it("never calls the provider for the worker that lost the claim", async () => {
    const process = processor();
    // Force the public-reply claim to be taken before either worker runs.
    await mockPrisma.commentDelivery.create({
      data: { automationId: "auto_1", commentId: "comment_1", leg: "public-reply" },
    });

    await process(job());

    expect(mockSendCommentReply).not.toHaveBeenCalled();
    // The DM leg is claimed independently and still goes out.
    expect(mockSendPrivateReply).toHaveBeenCalledTimes(1);
  });

  it("does not let the loser overwrite the winner's recorded outcome", async () => {
    const process = processor();
    await Promise.all([process(job({}, "a")), process(job({}, "b"))]);

    const sentUpdates = mockPrisma.dmLog.update.mock.calls.filter(
      ([arg]) => (arg as { data?: { publicReplySentAt?: Date } }).data?.publicReplySentAt,
    );
    expect(sentUpdates).toHaveLength(1);
  });
});

describe("E. worker retry after a successful send", () => {
  it("does not resend after the completion markers are persisted", async () => {
    mockPrisma.dmLog.findUnique.mockResolvedValue({
      status: "SENT",
      publicReplySentAt: new Date(),
      dmSentAt: new Date(),
    });

    await processor()(job({}, "retry_after_success"));

    expect(mockSendCommentReply).not.toHaveBeenCalled();
    expect(mockSendPrivateReply).not.toHaveBeenCalled();
  });

  it("keeps the claim when a leg fails so a retry can reclaim and resend", async () => {
    mockSendCommentReply.mockRejectedValueOnce(new Error("network down"));
    const process = processor();

    await process(job({}, "attempt_1"));
    // Claim released on failure, so the retry is still allowed to send.
    await process(job({}, "attempt_2"));

    expect(mockSendCommentReply).toHaveBeenCalledTimes(2);
  });

  it("does not fail the job when a duplicate loses the claim", async () => {
    const process = processor();
    await process(job({}, "first"));
    await expect(process(job({}, "second"))).resolves.toBeUndefined();
  });
});

describe("F. different comments stay independent", () => {
  it("sends separately for two distinct comments", async () => {
    const process = processor();
    await process(job({ commentId: "comment_a" }, "j1"));
    await process(job({ commentId: "comment_b" }, "j2"));

    expect(mockSendCommentReply).toHaveBeenCalledTimes(2);
    expect(mockSendPrivateReply).toHaveBeenCalledTimes(2);
  });
});

describe("G. different campaigns stay independent", () => {
  it("does not let one campaign's claim suppress another's reply", async () => {
    mockPrisma.automation.findMany.mockResolvedValue([
      automation({ id: "auto_1" }),
      automation({ id: "auto_2" }),
    ]);
    // Faithful stand-in for the cross-campaign check: the SENT row only exists
    // once the first campaign's DM has actually been persisted, which is what
    // lets the second campaign skip its own private reply.
    let privateReplySent = false;
    mockSendPrivateReply.mockImplementation(async () => {
      privateReplySent = true;
      return { message_id: "dm_1" };
    });
    mockPrisma.dmLog.findFirst.mockImplementation(
      async (args: { where?: { status?: string } } = {}) =>
        args.where?.status === "SENT"
          ? privateReplySent
            ? { automation: { name: "first campaign" } }
            : null
          : { commenterName: "someone" },
    );

    await processor()(job());

    // Each campaign claims under its own automationId.
    const claimed = mockPrisma.commentDelivery.create.mock.calls.map(
      ([arg]) => (arg as { data: { automationId: string; leg: string } }).data,
    );
    expect(claimed).toEqual(
      expect.arrayContaining([
        { automationId: "auto_1", commentId: "comment_1", leg: "public-reply" },
        { automationId: "auto_2", commentId: "comment_1", leg: "public-reply" },
      ]),
    );
    // The public reply is per campaign by product design; only the DM leg is
    // deduped across campaigns, because Instagram allows one private reply.
    expect(mockSendCommentReply).toHaveBeenCalledTimes(2);
    expect(mockSendPrivateReply).toHaveBeenCalledTimes(1);
  });

  it("keeps the existing cross-campaign private-reply dedup", async () => {
    mockPrisma.automation.findMany.mockResolvedValue([
      automation({ id: "auto_1" }),
      automation({ id: "auto_2" }),
    ]);
    mockPrisma.dmLog.findFirst.mockImplementation(
      async (args: { where?: { status?: string } } = {}) =>
        args.where?.status === "SENT"
          ? { automation: { name: "first campaign" } }
          : { commenterName: "someone" },
    );

    await processor()(job());

    expect(mockSendPrivateReply).not.toHaveBeenCalled();
    expect(mockPrisma.dmLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "SKIPPED_DEDUP" }),
      }),
    );
  });
});

describe("campaign without a public reply", () => {
  it("claims only the private-reply leg", async () => {
    mockPrisma.automation.findMany.mockResolvedValue([
      automation({ publicReplyEnabled: false }),
    ]);

    await processor()(job());

    const legs = mockPrisma.commentDelivery.create.mock.calls.map(
      ([arg]) => (arg as { data: { leg: string } }).data.leg,
    );
    expect(legs).toEqual(["private-reply"]);
    expect(mockSendCommentReply).not.toHaveBeenCalled();
  });
});

describe("no credentials", () => {
  it("makes no external call and records the failure", async () => {
    mockPrisma.automation.findMany.mockResolvedValue([
      automation({
        instagramAccount: { id: "ig_row_1", instagramId: "ig_1", accessToken: "" },
      }),
    ]);

    await processor()(job());

    expect(mockSendCommentReply).not.toHaveBeenCalled();
    expect(mockSendPrivateReply).not.toHaveBeenCalled();
  });
});