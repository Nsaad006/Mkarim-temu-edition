-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "allowedCategories" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "cartShippingText" TEXT NOT NULL DEFAULT 'Logistique incluse',
ADD COLUMN     "whyFeatures" JSONB NOT NULL DEFAULT '[{"icon":"CreditCard","title":"Paiement à la Livraison","description":"Payez en cash à la réception de votre commande. Simple et sécurisé."},{"icon":"Truck","title":"Livraison Rapide","description":"Livraison partout au Maroc en 24-72h selon votre ville."},{"icon":"ShieldCheck","title":"Garantie Produits","description":"Tous nos produits sont couverts par une garantie officielle."},{"icon":"Award","title":"Qualité Premium","description":"Nous sélectionnons uniquement des produits de qualité supérieure."},{"icon":"Headphones","title":"Support Client","description":"Notre équipe est disponible pour vous accompagner avant et après achat."},{"icon":"Clock","title":"Réponse Rapide","description":"Confirmation de commande sous 24h et suivi personnalisé."}]';

-- CreateTable
CREATE TABLE "ReturnedItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReturnedItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReturnedItem_orderId_idx" ON "ReturnedItem"("orderId");

-- CreateIndex
CREATE INDEX "ReturnedItem_productId_idx" ON "ReturnedItem"("productId");

-- AddForeignKey
ALTER TABLE "ReturnedItem" ADD CONSTRAINT "ReturnedItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnedItem" ADD CONSTRAINT "ReturnedItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
