-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "invoiceFooterText" TEXT NOT NULL DEFAULT 'Merci de votre confiance.',
ADD COLUMN     "invoiceNotes" TEXT DEFAULT 'Facture générée informatiquement.',
ADD COLUMN     "invoiceShowTax" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "invoiceTaxRate" DOUBLE PRECISION NOT NULL DEFAULT 20.0;
