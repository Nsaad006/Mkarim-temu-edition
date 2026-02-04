
import prisma from './lib/prisma';

async function enableEmail() {
    console.log('🔄 Enabling email system...');
    try {
        const settings = await prisma.settings.findFirst();
        if (settings) {
            await prisma.settings.update({
                where: { id: settings.id },
                data: { emailEnabled: true }
            });
            console.log('✅ Email system enabled successfully.');
        } else {
            console.error('❌ Settings not found.');
        }
    } catch (error) {
        console.error('❌ Failed to enable email:', error);
    } finally {
        await prisma.$disconnect();
    }
}

enableEmail();
