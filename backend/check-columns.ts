import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Settings';
    `;
        console.log('Columns in Settings table:', JSON.stringify(columns, null, 2));
    } catch (e: any) {
        console.error('Error querying columns:', e.message || e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
