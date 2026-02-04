-- AlterTable
ALTER TABLE "Settings" DROP COLUMN "emailClientId",
DROP COLUMN "emailClientSecret",
DROP COLUMN "emailRefreshToken",
ADD COLUMN     "emailAppPassword" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "WholesalePayment" (
    "id" TEXT NOT NULL,
    "wholesaleOrderId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "WholesalePayment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WholesalePayment" ADD CONSTRAINT "WholesalePayment_wholesaleOrderId_fkey" FOREIGN KEY ("wholesaleOrderId") REFERENCES "WholesaleOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
