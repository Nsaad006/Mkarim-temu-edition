import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, authorize } from './auth';
import { PERMISSIONS } from '../constants/permissions';

const router = Router();

// GET /api/stats/summary - Public summary stats for homepage
router.get('/summary', async (req: Request, res: Response) => {
    try {
        const [totalProducts, totalCategories, totalCities, totalCustomers] = await Promise.all([
            prisma.product.count({ where: { inStock: true } }),
            prisma.category.count({ where: { active: true } }),
            prisma.city.count(),
            prisma.customer.count()
        ]);

        res.json({
            totalProducts,
            totalCategories,
            totalCities,
            totalCustomers,
            deliveryTime: '24-72h',
            paymentMethods: ['COD', 'Carte bancaire']
        });
    } catch (error) {
        console.error('Error fetching summary stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// GET /api/stats - Dashboard statistics (all authenticated admin users)
router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [totalOrders, totalProducts, totalCategories, totalCities] = await Promise.all([
            prisma.order.count(),
            prisma.product.count(),
            prisma.category.count(),
            prisma.city.count()
        ]);

        const pendingOrders = await prisma.order.count({
            where: { status: 'PENDING' }
        });

        const confirmedOrders = await prisma.order.count({
            where: { status: 'CONFIRMED' }
        });

        const deliveredOrders = await prisma.order.count({
            where: { status: 'DELIVERED' }
        });

        // Revenue this month (MTD)
        const [retailRevenueResult, wholesaleRevenueResult] = await Promise.all([
            prisma.order.aggregate({
                _sum: { total: true },
                where: {
                    status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] },
                    createdAt: { gte: firstDayOfMonth }
                }
            }),
            prisma.wholesaleOrder.aggregate({
                _sum: { advanceAmount: true },
                where: {
                    createdAt: { gte: firstDayOfMonth }
                }
            })
        ]);

        const totalRevenue = (retailRevenueResult._sum.total || 0) + (wholesaleRevenueResult._sum.advanceAmount || 0);

        // Financial Intelligence (Admin/Editor Only)
        // Check legacy roles or permissions
        const user = (req as any).user;
        const isStaff = ['super_admin', 'editor'].includes(user.role) || user.permissions?.includes(PERMISSIONS.ANALYTICS_VIEW);

        let financialStats = {};

        if (isStaff) {
            const allProducts = await prisma.product.findMany({
                select: {
                    id: true,
                    quantity: true,
                    procurements: {
                        select: { unitCostPrice: true, quantityPurchased: true }
                    }
                }
            });

            // Calculate Inventory Value using Weighted Average Cost
            let currentInventoryValue = 0;
            const wacMap = new Map<string, number>();

            allProducts.forEach(p => {
                const totalCost = p.procurements.reduce((sum, pr) => sum + (pr.unitCostPrice * pr.quantityPurchased), 0);
                const totalQty = p.procurements.reduce((sum, pr) => sum + pr.quantityPurchased, 0);
                const wac = totalQty > 0 ? totalCost / totalQty : 0;
                wacMap.set(p.id, wac);
                currentInventoryValue += p.quantity * wac;
            });

            // Calculate Profit this month (Retail)
            const monthOrders = await prisma.order.findMany({
                where: {
                    status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] },
                    createdAt: { gte: firstDayOfMonth }
                },
                include: { items: true }
            });

            let currentMonthProfit = 0;
            monthOrders.forEach(order => {
                order.items.forEach(item => {
                    const wac = wacMap.get(item.productId) || 0;
                    currentMonthProfit += (item.price - wac) * item.quantity;
                });
            });

            // Calculate Profit this month (Wholesale Advances)
            const monthWholesaleOrders = await prisma.wholesaleOrder.findMany({
                where: { createdAt: { gte: firstDayOfMonth } },
                include: { items: true }
            });

            monthWholesaleOrders.forEach(order => {
                if (order.totalAmount > 0 && order.advanceAmount > 0) {
                    let orderTotalCost = 0;
                    order.items.forEach(item => {
                        const wac = wacMap.get(item.productId) || 0;
                        orderTotalCost += wac * item.quantity;
                    });

                    // Pro-rate cost based on advance percentage
                    const paidRatio = order.advanceAmount / order.totalAmount;
                    const proratedCost = orderTotalCost * paidRatio;

                    currentMonthProfit += (order.advanceAmount - proratedCost);
                }
            });

            financialStats = {
                currentInventoryValue: Math.round(currentInventoryValue),
                capitalLockedInStock: Math.round(currentInventoryValue),
                totalProfit: Math.round(currentMonthProfit)
            };
        }

        res.json({
            totalOrders,
            totalProducts,
            totalCategories,
            totalCities,
            pendingOrders,
            confirmedOrders,
            deliveredOrders,
            totalRevenue,
            ...financialStats
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed' });
    }
});

// GET /api/stats/analytics - Detailed analytics (all authenticated admin users, though full data might be limited by role logic inside)
router.get('/analytics', authenticate, async (req: Request, res: Response) => {
    try {
        const { days = 30, from, to, year } = req.query;

        // Determine the target year for financial stats
        const targetYear = year ? Number(year) : new Date().getFullYear();

        const getLocalDateString = (date: Date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        let startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(days));

        if (from) startDate = new Date(from as string);
        let endDate = new Date();
        if (to) endDate = new Date(to as string);

        // Fetch orders in date range
        const orders = await prisma.order.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                },
                status: {
                    in: ['CONFIRMED', 'SHIPPED', 'DELIVERED']
                }
            },
            include: {
                items: {
                    include: {
                        product: {
                            include: {
                                category: true
                            }
                        }
                    }
                }
            }
        });

        // 1. Revenue History
        const revenueMap = new Map<string, { revenue: number, orders: number }>();

        // Initialize map with all dates
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = getLocalDateString(d);
            revenueMap.set(dateStr, { revenue: 0, orders: 0 });
        }

        orders.forEach(order => {
            const dateStr = getLocalDateString(new Date(order.createdAt));
            const current = revenueMap.get(dateStr) || { revenue: 0, orders: 0 };
            revenueMap.set(dateStr, {
                revenue: current.revenue + order.total,
                orders: current.orders + 1
            });
        });

        const revenueHistory = Array.from(revenueMap.entries())
            .map(([date, data]) => ({
                date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
                fullDate: date,
                revenue: data.revenue,
                orders: data.orders
            }))
            .sort((a, b) => a.fullDate.localeCompare(b.fullDate));

        // 2. Sales by City
        const cityMap = new Map<string, number>();
        orders.forEach(order => {
            const city = order.city || 'Inconnu';
            cityMap.set(city, (cityMap.get(city) || 0) + 1);
        });

        const salesByCity = Array.from(cityMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // 3. Top Products
        const productMap = new Map<string, {
            id: string,
            name: string,
            image: string,
            category: string,
            sales: number,
            revenue: number
        }>();

        orders.forEach(order => {
            order.items.forEach(item => {
                if (!item.product) return;

                const existing = productMap.get(item.productId) || {
                    id: item.productId,
                    name: item.product.name,
                    image: item.product.image,
                    category: item.product.category?.name || 'Sans catégorie',
                    sales: 0,
                    revenue: 0
                };

                productMap.set(item.productId, {
                    ...existing,
                    sales: existing.sales + item.quantity,
                    revenue: existing.revenue + (item.price * item.quantity)
                });
            });
        });

        const topProducts = Array.from(productMap.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);

        // 4. Low Stock
        const threshold = Number(req.query.lowStockThreshold) || 5;
        const lowStock = await prisma.product.findMany({
            where: {
                quantity: {
                    lte: threshold
                },
                inStock: true
            },
            include: {
                category: true
            },
            take: 10
        });

        // 5. Out of Stock (products marked as not in stock)
        const outOfStock = await prisma.product.findMany({
            where: {
                inStock: false
            },
            include: {
                category: true
            },
            take: 10
        });

        // 5. General Stats (Totals)
        const [totalRevenue, totalOrders, pendingOrders, deliveredOrders, totalProducts, totalCustomers, totalCities] = await Promise.all([
            prisma.order.aggregate({
                _sum: { total: true },
                where: {
                    status: {
                        in: ['CONFIRMED', 'SHIPPED', 'DELIVERED']
                    }
                }
            }),
            prisma.order.count(),
            prisma.order.count({ where: { status: 'PENDING' } }),
            prisma.order.count({ where: { status: 'DELIVERED' } }),
            prisma.product.count(),
            prisma.customer.count(),
            prisma.city.count()
        ]);

        // Financial Calculations
        const isStaff = ['super_admin', 'editor'].includes((req as any).user.role) || (req as any).user.permissions?.includes(PERMISSIONS.ANALYTICS_VIEW);
        let financialData = {};

        if (isStaff) {
            // Get all unique products in the orders to find their costs
            const productIds = Array.from(productMap.keys());
            const procurements = await prisma.procurement.findMany({
                where: { productId: { in: productIds } }
            });

            // Map weighted average cost for each product
            const wacMap = new Map<string, number>();
            productIds.forEach(pid => {
                const productProcurements = procurements.filter(p => p.productId === pid);
                const totalCost = productProcurements.reduce((sum, p) => sum + p.totalCost, 0);
                const totalQty = productProcurements.reduce((sum, p) => sum + p.quantityPurchased, 0);
                wacMap.set(pid, totalQty > 0 ? totalCost / totalQty : 0);
            });

            // Calculate profit for top products and total
            let totalProfit = 0;
            const topProductsWithProfit = topProducts.map(p => {
                const wac = wacMap.get(p.id) || 0;
                const profit = p.revenue - (wac * p.sales);
                totalProfit += profit;
                return { ...p, profit: Math.round(profit) };
            });

            const [totalCapital, allProducts] = await Promise.all([
                prisma.procurement.aggregate({ _sum: { totalCost: true } }),
                prisma.product.findMany({
                    select: {
                        id: true,
                        quantity: true,
                        procurements: { select: { unitCostPrice: true, quantityPurchased: true } }
                    }
                })
            ]);

            let inventoryValue = 0;
            allProducts.forEach(p => {
                const tc = p.procurements.reduce((sum, pr) => sum + (pr.unitCostPrice * pr.quantityPurchased), 0);
                const tq = p.procurements.reduce((sum, pr) => sum + pr.quantityPurchased, 0);
                const w = tq > 0 ? tc / tq : 0;
                inventoryValue += p.quantity * w;
            });

            financialData = {
                totalProfit: Math.round(totalProfit),
                topProducts: topProductsWithProfit,
                currentInventoryValue: Math.round(inventoryValue),
                capitalLockedInStock: Math.round(inventoryValue)
            };
        }

        res.json({
            revenueHistory,
            salesByCity,
            topProducts: (financialData as any).topProducts || topProducts,
            lowStock: lowStock.map(p => ({ ...p, status: p.quantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK' })),
            outOfStock,
            stats: {
                totalRevenue: totalRevenue._sum.total || 0,
                totalOrders,
                pendingOrders,
                deliveredOrders,
                totalProducts,
                totalCustomers,
                totalCities,
                ...financialData
            },
            monthlyStats: isStaff ? await (async () => {
                const yearStart = new Date(targetYear, 0, 1);
                const yearEnd = new Date(targetYear, 11, 31, 23, 59, 59);

                const yearOrders = await prisma.order.findMany({
                    where: {
                        createdAt: {
                            gte: yearStart,
                            lte: yearEnd
                        },
                        status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] }
                    },
                    include: { items: true }
                });

                // Get costs for all products
                const allProcurements = await prisma.procurement.findMany();
                const wacMap = new Map<string, number>();
                const productIds = Array.from(new Set(allProcurements.map(p => p.productId)));

                productIds.forEach(pid => {
                    const productProcurements = allProcurements.filter(p => p.productId === pid);
                    const totalCost = productProcurements.reduce((sum, p) => sum + p.totalCost, 0);
                    const totalQty = productProcurements.reduce((sum, p) => sum + p.quantityPurchased, 0);
                    wacMap.set(pid, totalQty > 0 ? totalCost / totalQty : 0);
                });

                const months = [
                    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
                ];

                const monthlyData = months.map((name, index) => ({
                    name,
                    month: index,
                    revenue: 0,
                    profit: 0
                }));

                yearOrders.forEach(order => {
                    const monthIdx = new Date(order.createdAt).getMonth();
                    monthlyData[monthIdx].revenue += order.total;
                    order.items.forEach(item => {
                        const wac = wacMap.get(item.productId) || 0;
                        monthlyData[monthIdx].profit += (item.price - wac) * item.quantity;
                    });
                });

                return monthlyData.map(m => ({
                    ...m,
                    profit: Math.round(m.profit)
                }));
            })() : []
        });

    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

export default router;
