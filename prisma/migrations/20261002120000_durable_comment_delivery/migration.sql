-- Durable, database-enforced claim for one outbound leg of one comment.
-- Two workers racing the same comment both INSERT here; the composite primary
-- key lets exactly one win, so only that one performs the external send.
-- Additive only: no existing table or column is altered and no data is touched.
CREATE TABLE "CommentDelivery" (
    "automationId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "leg" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentDelivery_pkey" PRIMARY KEY ("automationId", "commentId", "leg")
);

CREATE INDEX "CommentDelivery_automationId_commentId_idx" ON "CommentDelivery"("automationId", "commentId");