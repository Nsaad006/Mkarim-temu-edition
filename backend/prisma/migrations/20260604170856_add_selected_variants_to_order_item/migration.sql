-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "parentId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "selectedVariants" JSONB;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "salesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "variants" JSONB DEFAULT '[]';

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "aboutMissionTitle" TEXT NOT NULL DEFAULT 'Notre Mission',
ADD COLUMN     "aboutStatsLabel" TEXT NOT NULL DEFAULT 'Clients Satisfaits',
ADD COLUMN     "aboutValuesTitle" TEXT NOT NULL DEFAULT 'Nos Valeurs',
ADD COLUMN     "cartSubtotalText" TEXT NOT NULL DEFAULT 'Sous-total',
ADD COLUMN     "cartSummaryTitle" TEXT NOT NULL DEFAULT 'Résumé de la Commande',
ADD COLUMN     "filterBudgetTitle" TEXT NOT NULL DEFAULT 'Budget',
ADD COLUMN     "filterCategoryTitle" TEXT NOT NULL DEFAULT 'Catégorie',
ADD COLUMN     "filterSortTitle" TEXT NOT NULL DEFAULT 'Tri',
ADD COLUMN     "freeShippingText" TEXT DEFAULT 'Livraison gratuite',
ADD COLUMN     "productsPageSubtitle" TEXT NOT NULL DEFAULT 'MKARIM',
ADD COLUMN     "productsPageTitle" TEXT NOT NULL DEFAULT 'Catalogue Produits';

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
