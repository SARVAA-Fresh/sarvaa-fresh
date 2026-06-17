/*
  Warnings:

  - You are about to drop the column `full_address` on the `addresses` table. All the data in the column will be lost.
  - Added the required column `address_line1` to the `addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `area` to the `addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `full_name` to the `addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mobile` to the `addresses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "addresses" DROP COLUMN "full_address",
ADD COLUMN     "address_line1" TEXT NOT NULL,
ADD COLUMN     "address_line2" TEXT,
ADD COLUMN     "area" TEXT NOT NULL,
ADD COLUMN     "full_name" TEXT NOT NULL,
ADD COLUMN     "mobile" TEXT NOT NULL;
