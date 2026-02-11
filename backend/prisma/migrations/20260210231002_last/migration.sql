-- CreateEnum
CREATE TYPE "WholesalerType" AS ENUM ('PARTICULIER', 'ENTREPRISE');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'RETOUR';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "returnReason" TEXT;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "invoiceAddress" TEXT NOT NULL DEFAULT 'Maroc',
ADD COLUMN     "invoiceCustomerHeader" TEXT NOT NULL DEFAULT 'Facture pour :',
ADD COLUMN     "invoiceSubtitle" TEXT NOT NULL DEFAULT 'Vente de PC & Matériel Gaming';

-- AlterTable
ALTER TABLE "Wholesaler" ADD COLUMN     "ice" TEXT,
ADD COLUMN     "responsibleName" TEXT,
ADD COLUMN     "type" "WholesalerType" NOT NULL DEFAULT 'PARTICULIER';
