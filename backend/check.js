const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const allOrderItems = await prisma.orderItem.count();
        console.log(`Total OrderItems: ${allOrderItems}`);

        const allWholesaleOrderItems = await prisma.wholesaleOrderItem.count();
        console.log(`Total WholesaleOrderItems: ${allWholesaleOrderItems}`);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
