
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Fetching settings...');
        const settings = await prisma.settings.findFirst();
        console.log('Settings found:', settings);
    } catch (e) {
        console.error('Error fetching settings:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
