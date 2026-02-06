-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "image" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT true;
