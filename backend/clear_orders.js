const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clear() {
    try {
        console.log("Clearing all WholesaleOrderItems...");
        const result1 = await prisma.wholesaleOrderItem.deleteMany();
        console.log(`Deleted ${result1.count} WholesaleOrderItems.`);

        console.log("Clearing all WholesaleOrders...");
        const result2 = await prisma.wholesaleOrder.deleteMany();
        console.log(`Deleted ${result2.count} WholesaleOrders.`);

        console.log("Clearing all OrderItems...");
        const result3 = await prisma.orderItem.deleteMany();
        console.log(`Deleted ${result3.count} OrderItems.`);

        console.log("Clearing all Orders...");
        const result4 = await prisma.order.deleteMany();
        console.log(`Deleted ${result4.count} Orders.`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

clear();
