-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "commissionCancelPolicy" TEXT NOT NULL DEFAULT 'keep',
ADD COLUMN     "commissionGraceDays" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "commissionSplitConfirmPct" DOUBLE PRECISION NOT NULL DEFAULT 30,
ADD COLUMN     "commissionSplitDeliverPct" DOUBLE PRECISION NOT NULL DEFAULT 70,
ADD COLUMN     "commissionTrigger" TEXT NOT NULL DEFAULT 'on_delivery';
