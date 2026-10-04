/**
 * Self-reply guard.
 *
 * Instagram providers echo the account's own public replies back as inbound
 * comment events. Without a guard those echoes are queued, matched, claimed and
 * answered — and each answer is echoed again, which is how a self-trigger loop
 * starts. These tests pin the behaviour at both ingestion paths.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma, mockQueueAdd } = vi.hoisted(() => ({
  mockPrisma: {
    instagramAccount: { findMany: vi.fn() },
    webhookEvent: { create: vi.fn(), update: vi.fn() },
    dmLog: { findMany: vi.fn() },
  },
  mockQueueAdd: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/queue/client", () => ({
  getDMQueue: () => ({ add: mockQueueAdd }),
  getRedisConnection: vi.fn(),
  POSTBACK_JOB_NAME: "process-postback",
  FOLLOWUP_JOB_NAME: "process-followup",
  MESSAGE_JOB_NAME: "process-message",
}));

import { isSelfAuthoredComment } from "@/lib/instagram/self-authored";
import { processInstagramWebhook } from "@/lib/queue/process-webhook";

describe("isSelfAuthoredComment", () => {
  const selfInstagramId = "29512567691664692";
  const selfUsername = "nikhilainavalli.tech";

  it("matches when the author id equals the connected account's id", () => {
    expect(
      isSelfAuthoredComment({
        commenterId: selfInstagramId,
        selfInstagramId,
        selfUsername,
      }),
    ).toBe(true);
  });

  it("matches on username when the provider uses a different id space", () => {
    // Real Zernio case: the author id matches neither instagramId nor
    // platformUserId, so an id-only check misses it.
    expect(
      isSelfAuthoredComment({
        commenterId: "17841425656123274",
        commenterName: "nikhilainavalli.tech",
        selfInstagramId,
        selfUsername,
      }),
    ).toBe(true);
  });

  it("matches regardless of case, surrounding whitespace or a leading @", () => {
    for (const handle of ["NikhiLaInavalli.Tech", " nikhilainavalli.tech ", "@nikhilainavalli.tech"]) {
      expect(
        isSelfAuthoredComment({
          commenterId: "some-other-id",
          commenterName: handle,
          selfInstagramId,
          selfUsername,
        }),
      ).toBe(true);
    }
  });

  it("does not match a real customer comment", () => {
    expect(
      isSelfAuthoredComment({
        commenterId: "1119433663758347",
        commenterName: "unknown_person_nikhil",
        selfInstagramId,
        selfUsername,
      }),
    ).toBe(false);
  });

  it("does not match a similar but different handle", () => {
    expect(
      isSelfAuthoredComment({
        commenterId: "999",
        commenterName: "nikhilainavalli.tech.backup",
        selfInstagramId,
        selfUsername,
      }),
    ).toBe(false);
  });

  it("fails open when the provider gives no username", () => {
    // An unverifiable author must not silently drop real customers.
    expect(
      isSelfAuthoredComment({
        commenterId: "1119433663758347",
        selfInstagramId,
        selfUsername,
      }),
    ).toBe(false);
  });

  it("fails open when the connected account has no stored username", () => {
    expect(
      isSelfAuthoredComment({
        commenterId: "1119433663758347",
        commenterName: "unknown_person_nikhil",
        selfInstagramId,
        selfUsername: null,
      }),
    ).toBe(false);
  });
});

describe("webhook ingestion drops self-authored comments", () => {
  const igsid = "29512567691664692";

  function commentPayload(author: { id: string; username?: string }, text: string) {
    return {
      object: "instagram",
      entry: [
        {
          id: igsid,
          time: Date.now(),
          changes: [
            {
              field: "comments",
              value: { id: "c1", text, from: author, media: { id: "m1" } },
            },
          ],
        },
      ],
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.instagramAccount.findMany.mockResolvedValue([
      { id: "row_1", instagramId: igsid, workspaceId: "ws_1", username: "nikhilainavalli.tech" },
    ]);
    mockPrisma.webhookEvent.create.mockResolvedValue({ id: "we_1" });
    mockPrisma.webhookEvent.update.mockResolvedValue({});
    mockPrisma.dmLog.findMany.mockResolvedValue([]);
  });

  it("never queues a job for the account's own echoed reply", async () => {
    await processInstagramWebhook({
      payload: commentPayload(
        { id: "17841425656123274", username: "nikhilainavalli.tech" },
        "OpenReply live test successful.",
      ),
      provider: "ZERNIO",
      workspaceId: "ws_1",
    });

    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it("still queues a real customer comment", async () => {
    await processInstagramWebhook({
      payload: commentPayload(
        { id: "1119433663758347", username: "unknown_person_nikhil" },
        "OPENREPLY_TEST_01",
      ),
      provider: "ZERNIO",
      workspaceId: "ws_1",
    });

    const commentJobs = mockQueueAdd.mock.calls.filter(
      ([name]) => name === "process-comment",
    );
    expect(commentJobs).toHaveLength(1);
    expect(commentJobs[0][1]).toMatchObject({
      commentId: "c1",
      commenterId: "1119433663758347",
    });
  });

  it("does not match on text at all, so matchAnyWord cannot react to an echo", async () => {
    // The guard runs on author identity, before campaign matching. A campaign
    // matching every word would happily match the echo's text; the guard means
    // no job exists to be matched in the first place.
    await processInstagramWebhook({
      payload: commentPayload(
        { id: "17841425656123274", username: "nikhilainavalli.tech" },
        "LINK",
      ),
      provider: "ZERNIO",
      workspaceId: "ws_1",
    });

    expect(
      mockQueueAdd.mock.calls.filter(([name]) => name === "process-comment"),
    ).toHaveLength(0);
  });

  it("drops a self-authored comment carrying the campaign keyword", async () => {
    await processInstagramWebhook({
      payload: commentPayload(
        { id: "17841425656123274", username: "nikhilainavalli.tech" },
        "OPENREPLY_TEST_01",
      ),
      provider: "ZERNIO",
      workspaceId: "ws_1",
    });

    expect(
      mockQueueAdd.mock.calls.filter(([name]) => name === "process-comment"),
    ).toHaveLength(0);
  });
});