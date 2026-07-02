-- CreateEnum
CREATE TYPE "SettingCategory" AS ENUM ('BUSINESS', 'DELIVERY', 'PAYMENT', 'CONTACT', 'SYSTEM', 'STORE');

-- AlterTable
ALTER TABLE "settings" ADD COLUMN "category" "SettingCategory" NOT NULL DEFAULT 'SYSTEM';

-- CreateIndex
CREATE INDEX "settings_category_idx" ON "settings"("category");

-- CreateIndex
CREATE INDEX "settings_category_is_public_idx" ON "settings"("category", "is_public");
