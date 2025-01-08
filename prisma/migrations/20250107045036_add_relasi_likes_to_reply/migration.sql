/*
  Warnings:

  - A unique constraint covering the columns `[userId,threadId,replyId]` on the table `UserLike` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "UserLike" DROP CONSTRAINT "UserLike_threadId_fkey";

-- DropIndex
DROP INDEX "UserLike_userId_threadId_key";

-- AlterTable
ALTER TABLE "UserLike" ADD COLUMN     "replyId" INTEGER,
ALTER COLUMN "threadId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "UserLike_userId_threadId_replyId_key" ON "UserLike"("userId", "threadId", "replyId");

-- AddForeignKey
ALTER TABLE "UserLike" ADD CONSTRAINT "UserLike_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLike" ADD CONSTRAINT "UserLike_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "Reply"("id") ON DELETE SET NULL ON UPDATE CASCADE;
