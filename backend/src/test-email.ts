
import { sendEmail } from './lib/email';
import prisma from './lib/prisma';

async function test() {
    console.log('🧪 Starting Email Test...');

    try {
        const settings = await prisma.settings.findFirst();
        console.log('📊 Current Settings:');
        if (settings) {
            console.log(`- Enabled: ${settings.emailEnabled}`);
            console.log(`- Sender: ${settings.emailGmailUser}`);
            console.log(`- Admin Receiver: ${settings.emailAdminReceiver}`);
            console.log(`- App Password set: ${!!settings.emailAppPassword}`);

            if (!settings.emailEnabled) {
                console.warn('⚠️ Email sending is DISABLED in settings.');
            }

            if (settings.emailAdminReceiver) {
                console.log(`📧 Attempting to send test email to Admin: ${settings.emailAdminReceiver}`);
                await sendEmail(
                    settings.emailAdminReceiver,
                    'Test Email from Backend',
                    '<h1>It Works!</h1><p>This is a test email to verify your configuration.</p>'
                );
                console.log('✅ Test email attempt completed.');
            } else {
                console.error('❌ No Admin Receiver email configured. Cannot send test.');
            }
        } else {
            console.error('❌ No settings found in database.');
        }
    } catch (error) {
        console.error('❌ Test failed with error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

test();
