import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const settings = await prisma.settings.findFirst();
        console.log('Current settings:', JSON.stringify(settings, null, 2));
        if (settings && 'favicon' in settings) {
            console.log('favicon column exists and has value:', settings.favicon);
        } else {
            console.log('favicon property NOT found in settings object returned by prisma');
        }
    } catch (e: any) {
        console.error('Error fetching settings:', e.message || e);
        if (e.code === 'P2022') {
            console.error('Confirmed: Column does not exist in DB.');
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
