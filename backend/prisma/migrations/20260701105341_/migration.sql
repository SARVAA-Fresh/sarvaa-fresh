/*
  Warnings:

  - The values [PLACED,PACKED] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [CARD,WALLET] on the enum `PaymentMethod` will be removed. If these variants are still used in the database, this will fail.
  - The values [VERIFIED,REJECTED,REFUNDED] on the enum `PaymentStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING', 'CONFIRMED', 'PACKING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');
ALTER TABLE "orders" ALTER COLUMN "current_status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "current_status" TYPE "OrderStatus_new" USING ("current_status"::text::"OrderStatus_new");
ALTER TABLE "order_status_history" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";
ALTER TABLE "orders" ALTER COLUMN "current_status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentMethod_new" AS ENUM ('COD', 'UPI');
ALTER TABLE "payments" ALTER COLUMN "payment_method" TYPE "PaymentMethod_new" USING ("payment_method"::text::"PaymentMethod_new");
ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";
DROP TYPE "PaymentMethod_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentStatus_new" AS ENUM ('PENDING', 'PAYMENT_SUBMITTED', 'PAID', 'FAILED');
ALTER TABLE "orders" ALTER COLUMN "payment_status" DROP DEFAULT;
ALTER TABLE "payments" ALTER COLUMN "payment_status" DROP DEFAULT;
ALTER TABLE "orders" ALTER COLUMN "payment_status" TYPE "PaymentStatus_new" USING ("payment_status"::text::"PaymentStatus_new");
ALTER TABLE "payments" ALTER COLUMN "payment_status" TYPE "PaymentStatus_new" USING ("payment_status"::text::"PaymentStatus_new");
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "PaymentStatus_old";
ALTER TABLE "orders" ALTER COLUMN "payment_status" SET DEFAULT 'PENDING';
ALTER TABLE "payments" ALTER COLUMN "payment_status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "current_status" SET DEFAULT 'PENDING';
