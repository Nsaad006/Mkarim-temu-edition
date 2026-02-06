import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticate, authorize } from './auth';
import { PERMISSIONS } from '../constants/permissions';

const router = Router();

// GET /api/products - List all products with optional filters
router.get('/', async (req, res) => {
    try {
        const { categoryId, category, inStock, search, featured, published } = req.query;

        const where: any = {};

        // Support both categoryId (UUID or slug) and category (slug)
        const categoryIdentifier = categoryId || category;
        if (categoryIdentifier) {
            const categoryStr = String(categoryIdentifier);

            // Check if it's a UUID (contains hyphens and is 36 chars) or a slug
            const isUUID = categoryStr.includes('-') && categoryStr.length === 36;

            if (isUUID) {
                // It's a UUID, use directly
                where.categoryId = categoryStr;
            } else {
                // It's a slug, look up the category first (only active categories)
                const categoryRecord = await prisma.category.findUnique({
                    where: { slug: categoryStr, active: true }
                });
                if (categoryRecord) {
                    where.categoryId = categoryRecord.id;
                }
            }
        }

        if (inStock !== undefined) {
            where.inStock = inStock === 'true';
        }

        if (featured !== undefined) {
            where.isFeatured = featured === 'true';
        }

        if (published !== undefined) {
            where.published = published === 'true';
        }

        if (search) {
            const searchStr = String(search).toLowerCase();
            where.OR = [
                { name: { contains: searchStr, mode: 'insensitive' } },
                { description: { contains: searchStr, mode: 'insensitive' } }
            ];
        }

        const products = await prisma.product.findMany({
            where: {
                ...where,
                category: {
                    active: true
                }
            },
            include: {
                category: true,
                procurements: {
                    select: {
                        unitCostPrice: true,
                        quantityPurchased: true,
                        supplierId: true // Include supplierId
                    }
                }
            }
        });

        // Calculate weighted average cost for each product
        const productsWithStats = products.map(p => {
            const totalCost = p.procurements.reduce((sum, pr) => sum + (pr.unitCostPrice * pr.quantityPurchased), 0);
            const totalQty = p.procurements.reduce((sum, pr) => sum + pr.quantityPurchased, 0);
            const wac = totalQty > 0 ? Math.round(totalCost / totalQty) : 0;
            const stockValue = p.quantity * wac;

            const { procurements, ...productData } = p;
            return {
                ...productData,
                weightedAverageCost: wac,
                stockValue
            };
        });

        res.json(productsWithStats);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

router.post('/:id/adjust-cost', authenticate, authorize(['super_admin', 'editor'], PERMISSIONS.PRODUCTS_EDIT), async (req: any, res: Response) => {
    try {
        const id = req.params.id;
        const { unitCostPrice, password } = req.body;
        const adminId = req.user?.id;

        if (unitCostPrice === undefined || !password) {
            return res.status(400).json({ error: 'Nouveau prix et mot de passe requis' });
        }

        // 1. Verify password
        const admin = await prisma.admin.findUnique({ where: { id: adminId } });
        if (!admin) return res.status(404).json({ error: 'Admin non trouvé' });

        const isPasswordCorrect = await require('bcryptjs').compare(password, admin.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ error: 'Mot de passe incorrect' });
        }

        const newCost = Number(unitCostPrice);

        // 2. Transact the adjustment
        const result = await prisma.$transaction(async (tx) => {
            // Find the first procurement (usually the initial one)
            const firstProcurement = await tx.procurement.findFirst({
                where: { productId: id },
                orderBy: { purchaseDate: 'asc' }
            });

            if (!firstProcurement) {
                // If no procurement exists, just create one now (effectively fixing the product)
                const product = await tx.product.findUnique({ where: { id } });
                if (!product) throw new Error('Produit non trouvé');

                const totalCost = product.quantity * newCost;

                const procurement = await tx.procurement.create({
                    data: {
                        supplierId: (await tx.supplier.findFirst())?.id || '', // Fallback to any supplier
                        productId: id,
                        quantityPurchased: product.quantity,
                        unitCostPrice: newCost,
                        totalCost,
                        createdByAdminId: adminId
                    }
                });

                return procurement;
            }

            // If procurement exists, calculate difference and adjust
            const oldTotalCost = firstProcurement.totalCost;
            const newTotalCost = firstProcurement.quantityPurchased * newCost;
            const difference = newTotalCost - oldTotalCost;

            const updatedProcurement = await tx.procurement.update({
                where: { id: firstProcurement.id },
                data: {
                    unitCostPrice: newCost,
                    totalCost: newTotalCost
                },
                include: { product: true }
            });

            return updatedProcurement;
        });

        res.json(result);
    } catch (error) {
        console.error('Error adjusting cost:', error);
        res.status(500).json({ error: 'Erreur lors de l\'ajustement du coût' });
    }
});

// GET /api/products/:id - Get single product
router.get('/:id', async (req, res) => {
    try {
        const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];

        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                category: true,
                procurements: {
                    include: {
                        supplier: true
                    },
                    orderBy: { purchaseDate: 'desc' }
                }
            }
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Calculate stats
        const totalCost = product.procurements.reduce((sum, pr) => sum + (pr.unitCostPrice * pr.quantityPurchased), 0);
        const totalQty = product.procurements.reduce((sum, pr) => sum + pr.quantityPurchased, 0);
        const wac = totalQty > 0 ? Math.round(totalCost / totalQty) : 0;
        const stockValue = product.quantity * wac;

        res.json({
            ...product,
            weightedAverageCost: wac,
            stockValue
        });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

router.post('/', authenticate, authorize(['super_admin', 'editor'], PERMISSIONS.PRODUCTS_CREATE), async (req: any, res: Response) => {
    try {
        const {
            name, description, price, originalPrice, image, images,
            categoryId, inStock, quantity, badge, specs, isFeatured, published,
            supplierId, unitCostPrice // New required fields
        } = req.body;

        if (!supplierId || unitCostPrice === undefined) {
            return res.status(400).json({ error: 'Supplier and unit cost price are required for new products' });
        }

        const initialQuantity = Number(quantity) || 0;
        const costPrice = Number(unitCostPrice);
        const adminId = req.user?.id;

        // Handle images array - ensure it's an array
        const imageArray = images && Array.isArray(images) ? images : (image ? [image] : []);
        const primaryImage = imageArray[0] || image || '';

        const result = await prisma.$transaction(async (tx) => {
            // 1. Create product
            const newProduct = await tx.product.create({
                data: {
                    name,
                    description,
                    price: Number(price),
                    originalPrice: originalPrice ? Number(originalPrice) : null,
                    image: primaryImage,
                    images: imageArray,
                    categoryId,
                    inStock: inStock ?? true,
                    quantity: initialQuantity,
                    badge,
                    specs: specs || [],
                    isFeatured: isFeatured ?? false,
                    published: published ?? true
                } as any,
                include: {
                    category: true
                }
            });

            // 2. Create initial procurement
            await tx.procurement.create({
                data: {
                    supplierId,
                    productId: newProduct.id,
                    quantityPurchased: initialQuantity,
                    unitCostPrice: costPrice,
                    totalCost: initialQuantity * costPrice,
                    createdByAdminId: adminId
                }
            });

            return newProduct;
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// PUT /api/products/:id - Update product (admin)
router.put('/:id', authenticate, authorize(['super_admin', 'editor'], PERMISSIONS.PRODUCTS_EDIT), async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const {
            name, description, price, originalPrice, image, images,
            categoryId, inStock, quantity, badge, specs, isFeatured, published,
            supplierId, unitCostPrice, password // Fields to "fix" existing data
        } = req.body;

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
            ...(isFeatured !== undefined && { isFeatured: Boolean(isFeatured) }),
            ...(published !== undefined && { published: Boolean(published) })
        } as any;

        // Handle images array update
        if (images !== undefined) {
            const imageArray = Array.isArray(images) ? images : (images ? [images] : []);
            updateData.images = imageArray;
            updateData.image = imageArray[0] || '';  // Update primary image
        } else if (image !== undefined) {
            // Backward compatibility: if only image is provided
            updateData.image = image;
        }

        // Fetch existing product to compare quantity
        const existingProduct = await prisma.product.findUnique({
            where: { id },
            include: { procurements: { orderBy: { purchaseDate: 'desc' }, take: 1 } }
        });

        if (!existingProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const oldQuantity = existingProduct.quantity;
        const newQuantity = quantity !== undefined ? Number(quantity) : oldQuantity;
        const qtyDifference = newQuantity - oldQuantity;

        // Security Check: Adding stock manually requires Super Admin + Password
        if (qtyDifference > 0) {
            const adminId = (req as any).user?.id;
            const { password } = req.body;

            if (!password) {
                return res.status(400).json({ error: 'Mot de passe requis pour ajouter du stock.' });
            }

            const admin = await prisma.admin.findUnique({ where: { id: adminId } });
            if (!admin) {
                return res.status(404).json({ error: 'Admin non trouvé' });
            }

            if (admin.role !== 'super_admin') {
                return res.status(403).json({ error: 'Seul le Super Admin peut ajouter du stock manuellement.' });
            }

            const isPasswordCorrect = await require('bcryptjs').compare(password, admin.password);
            if (!isPasswordCorrect) {
                return res.status(401).json({ error: 'Mot de passe incorrect.' });
            }
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Update product
            const updatedProduct = await tx.product.update({
                where: { id },
                data: updateData,
                include: {
                    category: true,
                    procurements: {
                        orderBy: { purchaseDate: 'desc' },
                        take: 1
                    }
                }
            });

            const adminId = (req as any).user?.id;

            // 2. Logic for INCREASING stock (Procurement)
            if (qtyDifference > 0) {
                const costPrice = unitCostPrice ? Number(unitCostPrice) :
                    (existingProduct.procurements[0]?.unitCostPrice || 0);

                const finalSupplierId = supplierId || existingProduct.procurements[0]?.supplierId;

                if (!finalSupplierId || costPrice <= 0) {
                    // If we can't determine cost or supplier, we might want to warn or skip, 
                    // but for "adding stock" we really need these.
                    // For now, let's create it if we have a supplier.
                }

                if (finalSupplierId) {
                    const totalCost = qtyDifference * costPrice;

                    await tx.procurement.create({
                        data: {
                            supplierId: finalSupplierId,
                            productId: updatedProduct.id,
                            quantityPurchased: qtyDifference,
                            unitCostPrice: costPrice,
                            totalCost,
                            createdByAdminId: adminId
                        }
                    });
                }
            }
            // 3. Logic for "Fixing" product with NO procurements (if not caught by qtyDifference)
            else if (supplierId && unitCostPrice !== undefined && updatedProduct.procurements.length === 0) {
                const costPrice = Number(unitCostPrice);
                const qty = updatedProduct.quantity;
                const totalCost = qty * costPrice;

                await tx.procurement.create({
                    data: {
                        supplierId,
                        productId: updatedProduct.id,
                        quantityPurchased: qty,
                        unitCostPrice: costPrice,
                        totalCost,
                        createdByAdminId: adminId
                    }
                });
            }

            // 4. Update existing latest procurement supplier if explicitly changed
            if (supplierId && updatedProduct.procurements.length > 0) {
                const latest = updatedProduct.procurements[0];
                if (latest.supplierId !== supplierId) {
                    await tx.procurement.update({
                        where: { id: latest.id },
                        data: { supplierId }
                    });
                }
            }

            return updatedProduct;
        });

        res.json(result);
    } catch (error) {
        console.error('Error updating product:', error);
        if ((error as Prisma.PrismaClientKnownRequestError).code === 'P2025') {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// DELETE /api/products/:id - Delete product (admin)
router.delete('/:id', authenticate, authorize(['super_admin', 'editor'], PERMISSIONS.PRODUCTS_DELETE), async (req: Request, res: Response) => {
    try {
        const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];

        // Check if product exists in any orders
        const ordersWithProduct = await prisma.orderItem.findFirst({
            where: { productId: id }
        });

        if (ordersWithProduct) {
            return res.status(400).json({
                error: 'Cannot delete product that exists in orders. Consider marking it as out of stock instead.'
            });
        }

        // Check if product exists in wholesale orders
        const wholesaleOrdersWithProduct = await prisma.wholesaleOrderItem.findFirst({
            where: { productId: id }
        });

        if (wholesaleOrdersWithProduct) {
            return res.status(400).json({
                error: 'Cannot delete product that exists in wholesale orders.'
            });
        }

        await prisma.product.delete({
            where: { id }
        });

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting product:', error);
        if ((error as Prisma.PrismaClientKnownRequestError).code === 'P2025') {
            return res.status(404).json({ error: 'Product not found' });
        }
        if ((error as Prisma.PrismaClientKnownRequestError).code === 'P2003') {
            return res.status(400).json({
                error: 'Cannot delete product due to existing references. Please contact support.'
            });
        }
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

export default router;
