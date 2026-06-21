import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticate, authorize, optionalAuthenticate, AuthenticatedRequest } from './auth';
import { PERMISSIONS } from '../constants/permissions';
import { broadcastEvent, SSE_EVENTS } from '../lib/sse';

const router = Router();

// GET /api/products - List all products with optional filters
router.get('/', optionalAuthenticate, async (req: Request, res: Response) => {
    try {
        const user = (req as AuthenticatedRequest).user;
        const { categoryId, category, inStock, search, featured, published, trashed } = req.query;

        const where: any = {};

        // Auto-cleanup logic: permanently delete products in trash > 3 days that have no orders
        try {
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            await prisma.product.deleteMany({
                where: {
                    deletedAt: { lt: threeDaysAgo },
                    orderItems: { none: {} },
                    wholesaleItems: { none: {} }
                }
            });
        } catch (err) {
            console.error('Error during auto-cleanup of trashed products:', err);
        }

        if (trashed === 'true') {
            where.deletedAt = { not: null };
        } else {
            where.deletedAt = null;
        }

        const categoryIdentifier = categoryId || category;
        if (categoryIdentifier) {
            const categoryStr = String(categoryIdentifier);
            const isUUID = categoryStr.includes('-') && categoryStr.length === 36;
            if (isUUID) {
                where.categoryId = categoryStr;
            } else {
                const categoryRecord = await prisma.category.findUnique({
                    where: { slug: categoryStr, active: true }
                });
                if (categoryRecord) {
                    where.categoryId = categoryRecord.id;
                }
            }
        }
        if (inStock !== undefined) where.inStock = inStock === 'true';
        if (featured !== undefined) where.isFeatured = featured === 'true';
        if (published !== undefined) where.published = published === 'true';
        if (search) {
            const searchStr = String(search).toLowerCase();
            where.OR = [
                { name: { contains: searchStr, mode: 'insensitive' } },
                { description: { contains: searchStr, mode: 'insensitive' } }
            ];
        }

        // Apply admin category permission restriction ONLY for admin-context requests.
        // Only `trashed` is a true admin-only flag — `published` is also used by the public storefront.
        // Public storefront requests must NEVER be filtered by admin category permissions.
        const isAdminRequest = trashed !== undefined;
        if (isAdminRequest && user && user.role !== 'super_admin') {
            const adminData: any = await prisma.admin.findUnique({
                where: { id: user.id },
                select: { allowedCategories: true } as any
            });

            if (adminData && adminData.allowedCategories && adminData.allowedCategories.length > 0) {
                if (where.categoryId) {
                    if (!adminData.allowedCategories.includes(where.categoryId as string)) {
                        return res.json([]);
                    }
                } else {
                    where.categoryId = { in: adminData.allowedCategories };
                }
            }
        }

        const products = await prisma.product.findMany({
            where: { ...where, category: { active: true } },
            include: {
                category: true,
                procurements: {
                    select: { unitCostPrice: true, quantityPurchased: true, supplierId: true }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        const productsWithStats = products.map(p => {
            const totalCost = p.procurements.reduce((sum, pr) => sum + (pr.unitCostPrice * pr.quantityPurchased), 0);
            const totalQty = p.procurements.reduce((sum, pr) => sum + pr.quantityPurchased, 0);
            const wac = totalQty > 0 ? Math.round(totalCost / totalQty) : 0;
            const stockValue = p.quantity * wac;
            const latestSupplierId = p.procurements.length > 0 ? p.procurements[p.procurements.length - 1].supplierId : null;
            const { procurements, ...productData } = p;
            return { ...productData, weightedAverageCost: wac, stockValue, supplierId: latestSupplierId };
        });

        res.json(productsWithStats);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// GET /api/products/returns/all - List all returned items
router.get('/returns/all', authenticate, authorize(['super_admin', 'editor', 'commercial', 'magasinier'], [PERMISSIONS.PRODUCTS_VIEW]), async (req, res) => {
    try {
        const returns = await prisma.returnedItem.findMany({
            include: {
                product: {
                    select: { name: true, image: true, price: true }
                },
                order: {
                    select: { orderNumber: true, customerName: true, status: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(returns);
    } catch (error) {
        console.error('Error fetching returned items:', error);
        res.status(500).json({ error: 'Failed to fetch returned items' });
    }
});

// POST /api/products/returns/:id/restock - Restock returned item
router.post('/returns/:id/restock', authenticate, authorize(['super_admin', 'editor', 'commercial', 'magasinier'], [PERMISSIONS.PRODUCTS_EDIT]), async (req, res) => {
    try {
        const { id } = req.params;
        const { quantityToRestock } = req.body;

        if (!quantityToRestock || quantityToRestock <= 0) {
            return res.status(400).json({ error: 'Invalid quantity' });
        }

        const returnedItem = await prisma.returnedItem.findUnique({
            where: { id }
        });

        if (!returnedItem) {
            return res.status(404).json({ error: 'Returned item not found' });
        }

        if (quantityToRestock > returnedItem.quantity) {
            return res.status(400).json({ error: 'Cannot restock more than the returned quantity' });
        }

        await prisma.$transaction(async (tx) => {
            // Update the product's main quantity (restock)
            await tx.product.update({
                where: { id: returnedItem.productId },
                data: {
                    quantity: { increment: quantityToRestock }
                }
            });

            // If we're fully restocking the returned item, we can delete the record or set quantity to 0
            if (quantityToRestock === returnedItem.quantity) {
                await tx.returnedItem.delete({
                    where: { id: returnedItem.id }
                });
            } else {
                // Otherwise just decrement its quantity
                await tx.returnedItem.update({
                    where: { id: returnedItem.id },
                    data: {
                        quantity: { decrement: quantityToRestock }
                    }
                });
            }
        });

        res.json({ success: true, message: 'Produit remis en stock avec succès' });
    } catch (error) {
        console.error('Error restocking returned item:', error);
        res.status(500).json({ error: 'Failed to fetch returned items' });
    }
});

router.post('/:id/adjust-cost', authenticate, authorize(['super_admin', 'editor'], [PERMISSIONS.PRODUCTS_EDIT, PERMISSIONS.PRODUCTS_COST_VIEW]), async (req: any, res: Response) => {
    try {
        const id = req.params.id;
        const { unitCostPrice, password } = req.body;
        const adminId = req.user?.id;
        if (unitCostPrice === undefined || !password) return res.status(400).json({ error: 'Nouveau prix et mot de passe requis' });
        const admin = await prisma.admin.findUnique({ where: { id: adminId } });
        if (!admin) return res.status(404).json({ error: 'Admin non trouvé' });
        const isPasswordCorrect = await require('bcryptjs').compare(password, admin.password);
        if (!isPasswordCorrect) return res.status(401).json({ error: 'Mot de passe incorrect' });
        const newCost = Number(unitCostPrice);
        const result = await prisma.$transaction(async (tx) => {
            const firstProcurement = await tx.procurement.findFirst({ where: { productId: id }, orderBy: { purchaseDate: 'asc' } });
            if (!firstProcurement) {
                const product = await tx.product.findUnique({ where: { id } });
                if (!product) throw new Error('Produit non trouvé');
                return await tx.procurement.create({
                    data: { supplierId: (await tx.supplier.findFirst())?.id || '', productId: id, quantityPurchased: product.quantity, unitCostPrice: newCost, totalCost: product.quantity * newCost, createdByAdminId: adminId }
                });
            }
            const oldTotalCost = firstProcurement.totalCost;
            const newTotalCost = firstProcurement.quantityPurchased * newCost;
            return await tx.procurement.update({ where: { id: firstProcurement.id }, data: { unitCostPrice: newCost, totalCost: newTotalCost }, include: { product: true } });
        });
        res.json(result);
    } catch (error) {
        console.error('Error adjusting cost:', error);
        res.status(500).json({ error: 'Erreur lors de l\'ajustement du coût' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
        const product = await prisma.product.findUnique({ where: { id }, include: { category: true, procurements: { include: { supplier: true }, orderBy: { purchaseDate: 'desc' } } } });
        if (!product) return res.status(404).json({ error: 'Product not found' });
        const totalCost = product.procurements.reduce((sum, pr) => sum + (pr.unitCostPrice * pr.quantityPurchased), 0);
        const totalQty = product.procurements.reduce((sum, pr) => sum + pr.quantityPurchased, 0);
        const wac = totalQty > 0 ? Math.round(totalCost / totalQty) : 0;
        const stockValue = product.quantity * wac;
        res.json({ ...product, weightedAverageCost: wac, stockValue });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

router.post('/', authenticate, authorize(['super_admin', 'editor', 'commercial'], [PERMISSIONS.PRODUCTS_CREATE, PERMISSIONS.PRODUCTS_STOCK_MANAGE]), async (req: any, res: Response) => {
    try {
        const { name, description, price, originalPrice, image, images, categoryId, inStock, quantity, badge, specs, variants, isFeatured, published, supplierId, unitCostPrice, salesCount } = req.body;
        if (!supplierId) return res.status(400).json({ error: 'Supplier is required for new products' });
        const initialQuantity = Number(quantity) || 0;
        const costPrice = Number(unitCostPrice) || 0;
        const adminId = req.user?.id;
        const imageArray = images && Array.isArray(images) ? images : (image ? [image] : []);
        const primaryImage = imageArray[0] || image || '';
        const result = await prisma.$transaction(async (tx) => {
            const newProduct = await tx.product.create({
                data: { name, description, price: Number(price), originalPrice: originalPrice ? Number(originalPrice) : null, image: primaryImage, images: imageArray, categoryId, inStock: inStock ?? true, quantity: initialQuantity, badge, specs: specs || [], variants: variants || [], isFeatured: isFeatured ?? false, published: published ?? true, salesCount: Number(salesCount) || 0 } as any,
                include: { category: true }
            });
            await tx.procurement.create({ data: { supplierId, productId: newProduct.id, quantityPurchased: initialQuantity, unitCostPrice: costPrice, totalCost: initialQuantity * costPrice, createdByAdminId: adminId } });
            return newProduct;
        });
        broadcastEvent(SSE_EVENTS.PRODUCT_CREATED, { productId: result.id, name: result.name });
        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

router.put('/:id', authenticate, authorize(['super_admin', 'editor', 'commercial'], [PERMISSIONS.PRODUCTS_EDIT, PERMISSIONS.PRODUCTS_STOCK_MANAGE]), async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const { name, description, price, originalPrice, image, images, categoryId, inStock, quantity, badge, specs, variants, isFeatured, published, supplierId, unitCostPrice, salesCount, password } = req.body;
        const adminId = (req as any).user?.id;
        const userPerms = (req as any).user?.permissions || [];
        const existingProduct = await prisma.product.findUnique({ where: { id }, include: { procurements: { orderBy: { purchaseDate: 'desc' }, take: 1 } } });
        if (!existingProduct) return res.status(404).json({ error: 'Product not found' });
        const oldQuantity = existingProduct.quantity;
        const newQuantity = quantity !== undefined ? Number(quantity) : oldQuantity;
        const qtyDifference = newQuantity - oldQuantity;
        if (qtyDifference > 0) {
            if (!password) return res.status(400).json({ error: 'Mot de passe requis pour ajouter du stock.' });
            const admin = await prisma.admin.findUnique({ where: { id: adminId } });
            if (!admin) return res.status(404).json({ error: 'Admin non trouvé' });
            const hasPermission = admin.role === 'super_admin' || userPerms.includes(PERMISSIONS.PRODUCTS_STOCK_MANAGE);
            if (!hasPermission) return res.status(403).json({ error: "Vous n'avez pas la permission d'ajouter du stock manuellement." });
            const isPasswordCorrect = await require('bcryptjs').compare(password, admin.password);
            if (!isPasswordCorrect) return res.status(401).json({ error: 'Mot de passe incorrect.' });
        }
        const updateData: any = {
            ...(name && { name }),
            ...(description && { description }),
            ...(price !== undefined && { price: Number(price) }),
            ...(originalPrice !== undefined && { originalPrice: originalPrice ? Number(originalPrice) : null }),
            ...(categoryId && { categoryId }),
            ...(inStock !== undefined && { inStock: Boolean(inStock) }),
            ...(quantity !== undefined && { quantity: Number(quantity) }),
            ...(badge !== undefined && { badge }),
            ...(specs && { specs }),
            ...(variants !== undefined && { variants: variants || [] }),
            ...(isFeatured !== undefined && { isFeatured: Boolean(isFeatured) }),
            ...(published !== undefined && { published: Boolean(published) }),
            ...(salesCount !== undefined && { salesCount: Number(salesCount) })
        } as any;
        if (images !== undefined) {
            const imageArray = Array.isArray(images) ? images : (images ? [images] : []);
            updateData.images = imageArray;
            updateData.image = imageArray[0] || '';
        } else if (image !== undefined) {
            updateData.image = image;
        }
        const result = await prisma.$transaction(async (tx) => {
            const updatedProduct = await tx.product.update({ where: { id }, data: updateData, include: { category: true, procurements: { orderBy: { purchaseDate: 'desc' }, take: 1 } } });
            if (qtyDifference > 0) {
                const costPrice = unitCostPrice ? Number(unitCostPrice) : (existingProduct.procurements[0]?.unitCostPrice || 0);
                const finalSupplierId = supplierId || existingProduct.procurements[0]?.supplierId;
                if (finalSupplierId) {
                    await tx.procurement.create({ data: { supplierId: finalSupplierId, productId: updatedProduct.id, quantityPurchased: qtyDifference, unitCostPrice: costPrice, totalCost: qtyDifference * costPrice, createdByAdminId: adminId } });
                }
            } else if (supplierId && unitCostPrice !== undefined && updatedProduct.procurements.length === 0) {
                const costPrice = Number(unitCostPrice);
                await tx.procurement.create({ data: { supplierId, productId: updatedProduct.id, quantityPurchased: updatedProduct.quantity, unitCostPrice: costPrice, totalCost: updatedProduct.quantity * costPrice, createdByAdminId: adminId } });
            }
            if (supplierId && updatedProduct.procurements.length > 0) {
                const latest = updatedProduct.procurements[0];
                const procUpdateData: any = {};
                if (latest.supplierId !== supplierId) procUpdateData.supplierId = supplierId;
                // Allow updating cost from 0 → non-zero without password (initial cost setup)
                if (unitCostPrice !== undefined && Number(unitCostPrice) > 0 && latest.unitCostPrice === 0) {
                    procUpdateData.unitCostPrice = Number(unitCostPrice);
                    procUpdateData.totalCost = updatedProduct.quantity * Number(unitCostPrice);
                }
                if (Object.keys(procUpdateData).length > 0) {
                    await tx.procurement.update({ where: { id: latest.id }, data: procUpdateData });
                }
            } else if (supplierId && !updatedProduct.procurements.length) {
                // No procurement at all and no qty change — create one if cost provided
                if (unitCostPrice !== undefined && Number(unitCostPrice) > 0) {
                    const costPrice = Number(unitCostPrice);
                    await tx.procurement.create({ data: { supplierId, productId: updatedProduct.id, quantityPurchased: updatedProduct.quantity, unitCostPrice: costPrice, totalCost: updatedProduct.quantity * costPrice, createdByAdminId: adminId } });
                }
            }
            return updatedProduct;
        });
        broadcastEvent(SSE_EVENTS.PRODUCT_UPDATED, { productId: result.id, name: result.name });
        res.json(result);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

router.delete('/:id', authenticate, authorize(['super_admin', 'editor'], [PERMISSIONS.PRODUCTS_DELETE]), async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        // Soft delete: move to trash
        await prisma.product.update({
            where: { id },
            data: { deletedAt: new Date(), published: false }
        });
        broadcastEvent(SSE_EVENTS.PRODUCT_DELETED, { productId: id });
        res.status(204).send();
    } catch (error) {
        console.error('Error softly deleting product:', error);
        res.status(500).json({ error: 'Failed to move product to trash' });
    }
});

// Restore product from trash
router.post('/:id/restore', authenticate, authorize(['super_admin', 'editor'], [PERMISSIONS.PRODUCTS_EDIT]), async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        await prisma.product.update({
            where: { id },
            data: { deletedAt: null }
        });
        broadcastEvent(SSE_EVENTS.PRODUCT_UPDATED, { productId: id });
        res.json({ success: true });
    } catch (error) {
        console.error('Error restoring product:', error);
        res.status(500).json({ error: 'Failed to restore product' });
    }
});

// Force delete product permanently
router.delete('/:id/force', authenticate, authorize(['super_admin', 'editor'], [PERMISSIONS.PRODUCTS_DELETE]), async (req: Request, res: Response) => {
    try {
        const id = req.params.id;

        // Check if it exists in orders first
        const inOrders = await prisma.orderItem.findFirst({ where: { productId: id } });
        const inWholesale = await prisma.wholesaleOrderItem.findFirst({ where: { productId: id } });

        if (inOrders) {
            return res.status(400).json({ error: `Cannot permanently delete product. Found in OrderItem ID: ${inOrders.id} (OrderId: ${inOrders.orderId})` });
        }
        if (inWholesale) {
            return res.status(400).json({ error: `Cannot permanently delete product. Found in WholesaleOrderItem ID: ${inWholesale.id} (WholesaleOrderId: ${inWholesale.wholesaleOrderId})` });
        }

        await prisma.product.delete({ where: { id } });
        broadcastEvent(SSE_EVENTS.PRODUCT_DELETED, { productId: id });
        res.status(204).send();
    } catch (error) {
        console.error('Error force deleting product:', error);
        res.status(500).json({ error: 'Failed to permanently delete product' });
    }
});

export default router;
