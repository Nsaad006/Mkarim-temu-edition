-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "isFavorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isLoyal" BOOLEAN NOT NULL DEFAULT false;
