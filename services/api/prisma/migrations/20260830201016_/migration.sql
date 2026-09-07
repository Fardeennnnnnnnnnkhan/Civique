/*
  Warnings:

  - You are about to drop the column `in_app` on the `notification_preferences` table. All the data in the column will be lost.
  - You are about to drop the column `idempotency_key` on the `notifications` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[idempotency_key]` on the table `wards` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "notifications_idempotency_key_key";

-- AlterTable
ALTER TABLE "notification_preferences" DROP COLUMN "in_app",
ADD COLUMN     "inApp" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "idempotency_key";

-- AlterTable
ALTER TABLE "wards" ADD COLUMN     "idempotency_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "wards_idempotency_key_key" ON "wards"("idempotency_key");
