import nodemailer from 'nodemailer';
import prisma from './prisma';

/**
 * Sends an email using Gmail SMTP and App Password stored in database.
 */
export const sendEmail = async (to: string, subject: string, html: string, attachments?: any[]) => {
    try {
        const settings = await prisma.settings.findFirst();

        if (!settings) {
            console.log('📧 Settings not found in database.');
            return;
        }

        if (!settings.emailEnabled) {
            console.log('📧 Email system is disabled in settings.');
            return;
        }

        const emailUser = settings.emailGmailUser?.trim();
        const emailPass = settings.emailAppPassword?.trim();
        const emailSenderName = settings.emailSenderName;

        if (!emailUser || !emailPass) {
            console.error('❌ Email configuration is missing credentials (User/AppPassword).');
            return;
        }

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // use SSL
            auth: {
                user: emailUser,
                pass: emailPass
            }
        });

        console.log(`📨 Sending via Gmail SMTP to ${to}...`);

        const info = await transporter.sendMail({
            from: `"${emailSenderName || 'Store'}" <${emailUser}>`,
            to,
            subject,
            html,
            attachments
        });

        console.log('✅ Email sent successfully:', info.messageId);
        return info;
    } catch (error) {
        console.error('❌ Error in sendEmail (SMTP):', error);
        throw error;
    }
};

/**
 * Send order confirmation to customer and notification to admin
 */
export const sendOrderEmails = async (order: any) => {
    try {
        const settings = await prisma.settings.findFirst();
        if (!settings || !settings.emailEnabled) {
            console.log('⏭️ Skipping emails: disabled or no settings');
            return;
        }

        const currency = settings.currency || 'DH';
        const storeName = settings.storeName || 'MKARIM Store';

        // 1. Prepare items HTML
        const itemsHtml = order.items.map((item: any) => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.product?.name || 'Produit'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">x${item.quantity}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.price.toLocaleString()} ${currency}</td>
            </tr>
        `).join('');

        const emailTemplate = (isForAdmin: boolean) => `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                <div style="background-color: #eb4432; padding: 20px; text-align: center; color: white;">
                    <h1 style="margin: 0;">${storeName}</h1>
                    <p style="margin: 5px 0 0;">${isForAdmin ? 'Nouvelle Commande Reçue' : 'Confirmation de Commande'}</p>
                </div>
                <div style="padding: 30px;">
                    <p>Bonjour ${isForAdmin ? 'Admin' : order.customerName},</p>
                    <p>${isForAdmin
                ? `Une nouvelle commande vient d'être passée sur votre boutique.`
                : `Merci pour votre achat ! Votre commande <strong>#${order.orderNumber}</strong> a été enregistrée avec succès.`
            }</p>
                    
                    <h3 style="border-bottom: 2px solid #eb4432; padding-bottom: 5px; margin-top: 30px;">Récapitulatif de la commande</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background-color: #f9f9f9;">
                                <th style="padding: 10px; text-align: left;">Produit</th>
                                <th style="padding: 10px; text-align: center;">Qté</th>
                                <th style="padding: 10px; text-align: right;">Prix</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="2" style="padding: 20px 10px 10px; text-align: right; font-weight: bold;">TOTAL :</td>
                                <td style="padding: 20px 10px 10px; text-align: right; font-weight: bold; color: #eb4432; font-size: 1.2em;">${order.total.toLocaleString()} ${currency}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div style="margin-top: 30px; background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
                        <h4 style="margin-top: 0;">Informations de livraison :</h4>
                        <p style="margin: 5px 0;"><strong>Nom:</strong> ${order.customerName}</p>
                        <p style="margin: 5px 0;"><strong>Téléphone:</strong> ${order.phone}</p>
                        <p style="margin: 5px 0;"><strong>Ville:</strong> ${order.city}</p>
                        <p style="margin: 5px 0;"><strong>Adresse:</strong> ${order.address}</p>
                    </div>

                    ${!isForAdmin ? `
                    <div style="margin-top: 30px; text-align: center;">
                        <p>Nous vous contacterons bientôt pour confirmer votre livraison.</p>
                    </div>
                    ` : `
                    <div style="margin-top: 30px; text-align: center;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/admin/orders" style="background-color: #333; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Voir dans le Dashboard</a>
                    </div>
                    `}
                </div>
                <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 0.8em; color: #777;">
                    <p>&copy; ${new Date().getFullYear()} ${storeName}. Tous droits réservés.</p>
                </div>
            </div>
        `;

        // 2. Send to Customer (if email provided)
        if (order.email) {
            console.log(`📧 Sending confirmation to customer: ${order.email}`);
            await sendEmail(
                order.email,
                `Confirmation de votre commande #${order.orderNumber} - ${storeName}`,
                emailTemplate(false)
            ).catch(err => console.error('❌ Failed to send customer email:', err));
        } else {
            console.log('ℹ️ No customer email provided, skipping confirmation email.');
        }

        // 3. Send to Admin
        if (settings.emailAdminReceiver) {
            console.log(`📧 Sending notification to admin: ${settings.emailAdminReceiver}`);
            await sendEmail(
                settings.emailAdminReceiver,
                `🚨 Nouvelle Commande #${order.orderNumber} - ${order.customerName}`,
                emailTemplate(true)
            ).catch(err => console.error('❌ Failed to send admin email:', err));
        } else {
            console.log('ℹ️ No admin receiver email set, skipping admin notification.');
        }
    } catch (error) {
        console.error('❌ Error in sendOrderEmails main block:', error);
    }
};

/**
 * Send order update notification to customer and admin
 */
export const sendOrderUpdatedEmails = async (order: any, newItems: any[]) => {
    try {
        const settings = await prisma.settings.findFirst();
        if (!settings || !settings.emailEnabled) {
            console.log('⏭️ Skipping update emails: disabled or no settings');
            return;
        }

        const currency = settings.currency || 'MAD';
        const storeName = settings.storeName || 'MKARIM Store';

        // Prepare items HTML for the new items
        const itemsHtml = newItems.map((item: any) => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.product?.name || 'Produit'}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">x${item.quantity}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.price.toLocaleString()} ${currency}</td>
            </tr>
        `).join('');

        const emailTemplate = (isForAdmin: boolean) => `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                <div style="background-color: #eb4432; padding: 20px; text-align: center; color: white;">
                    <h1 style="margin: 0;">${storeName}</h1>
                    <p style="margin: 5px 0 0;">Mise à jour de la commande</p>
                </div>
                <div style="padding: 30px;">
                    <p>Bonjour ${isForAdmin ? 'Admin' : order.customerName},</p>
                    <p>${isForAdmin
                ? `La commande <strong>#${order.orderNumber}</strong> vient d'être modifiée.`
                : `Votre commande <strong>#${order.orderNumber}</strong> a été modifiée avec succès.`
            }</p>
                    
                    <h3 style="border-bottom: 2px solid #eb4432; padding-bottom: 5px; margin-top: 30px;">Nouveau récapitulatif de la commande</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background-color: #f9f9f9;">
                                <th style="padding: 10px; text-align: left;">Produit</th>
                                <th style="padding: 10px; text-align: center;">Qté</th>
                                <th style="padding: 10px; text-align: right;">Prix</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="2" style="padding: 20px 10px 10px; text-align: right; font-weight: bold;">TOTAL :</td>
                                <td style="padding: 20px 10px 10px; text-align: right; font-weight: bold; color: #eb4432; font-size: 1.2em;">${order.total.toLocaleString()} ${currency}</td>
                            </tr>
                        </tfoot>
                    </table>

                    ${!isForAdmin ? `
                    <div style="margin-top: 30px; text-align: center;">
                        <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
                    </div>
                    ` : `
                    <div style="margin-top: 30px; text-align: center;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/admin/orders" style="background-color: #333; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Voir dans le Dashboard</a>
                    </div>
                    `}
                </div>
            </div>
        `;

        if (order.email) {
            console.log(`📧 Sending update notification to customer: ${order.email}`);
            await sendEmail(
                order.email,
                `Mise à jour de votre commande #${order.orderNumber} - ${storeName}`,
                emailTemplate(false)
            ).catch(err => console.error('❌ Failed to send customer update email:', err));
        }

        if (settings.emailAdminReceiver) {
            console.log(`📧 Sending update notification to admin: ${settings.emailAdminReceiver}`);
            await sendEmail(
                settings.emailAdminReceiver,
                `🚨 Commande mise à jour #${order.orderNumber} - ${order.customerName}`,
                emailTemplate(true)
            ).catch(err => console.error('❌ Failed to send admin update email:', err));
        }
    } catch (error) {
        console.error('❌ Error in sendOrderUpdatedEmails main block:', error);
    }
};
