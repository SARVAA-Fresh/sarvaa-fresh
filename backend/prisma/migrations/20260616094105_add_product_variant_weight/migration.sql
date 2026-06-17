-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "is_default" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "weight" DECIMAL(10,3);
