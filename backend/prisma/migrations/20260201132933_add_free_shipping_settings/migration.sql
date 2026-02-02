-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "freeShippingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "freeShippingThreshold" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "logo" TEXT DEFAULT '/uploads/logo-placeholder.png';
