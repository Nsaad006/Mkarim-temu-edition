import prisma from './prisma';
import { broadcastEvent, SSE_EVENTS } from './sse';

interface CommissionSettings {
    commissionTrigger: string;
    commissionSplitConfirmPct: number;
    commissionSplitDeliverPct: number;
    commissionCancelPolicy: string;
    commissionGraceDays: number;
}

export async function getCommissionSettings(): Promise<CommissionSettings> {
    const s = await prisma.settings.findFirst({
        select: {
            commissionTrigger: true,
            commissionSplitConfirmPct: true,
            commissionSplitDeliverPct: true,
            commissionCancelPolicy: true,
            commissionGraceDays: true,
        }
    });
    return s ?? {
        commissionTrigger: 'on_delivery',
        commissionSplitConfirmPct: 30,
        commissionSplitDeliverPct: 70,
        commissionCancelPolicy: 'keep',
        commissionGraceDays: 7,
    };
}

export async function calculateOrderCommission(orderId: string): Promise<number> {
    const items = await prisma.orderItem.findMany({
        where: { orderId },
        include: { product: { select: { commission: true } } }
    });
    return items.reduce((sum, item) => sum + item.quantity * item.product.commission, 0);
}

async function upsertRecord(orderId: string, agentId: string, amount: number): Promise<void> {
    const now = new Date();
    await prisma.commissionRecord.upsert({
        where: { orderId },
        create: { agentId, orderId, amount, month: now.getMonth() + 1, year: now.getFullYear(), status: 'PENDING' },
        // On re-confirmation after cancellation: restore to PENDING and reassign to the re-confirming agent
        update: { agentId, amount, status: 'PENDING', updatedAt: now }
    });
    broadcastEvent(SSE_EVENTS.COMMISSION_CHANGED, { agentId });
}

// Called when order is CONFIRMED
export async function handleConfirmCommission(orderId: string, agentId: string): Promise<void> {
    const settings = await getCommissionSettings();

    if (settings.commissionTrigger === 'on_delivery') return; // commission only at delivery

    const fullAmount = await calculateOrderCommission(orderId);
    if (fullAmount <= 0) return;

    if (settings.commissionTrigger === 'on_confirmation') {
        await upsertRecord(orderId, agentId, fullAmount);
    } else if (settings.commissionTrigger === 'split') {
        const confirmAmount = fullAmount * (settings.commissionSplitConfirmPct / 100);
        await upsertRecord(orderId, agentId, confirmAmount);
    }
}

// Called when order is DELIVERED
export async function handleDeliverCommission(orderId: string, confirmedById: string): Promise<void> {
    const settings = await getCommissionSettings();

    if (settings.commissionTrigger === 'on_confirmation') return; // already paid at confirmation

    const fullAmount = await calculateOrderCommission(orderId);
    if (fullAmount <= 0) return;

    if (settings.commissionTrigger === 'on_delivery') {
        await upsertRecord(orderId, confirmedById, fullAmount);
    } else if (settings.commissionTrigger === 'split') {
        const deliverAmount = fullAmount * (settings.commissionSplitDeliverPct / 100);
        const existing = await prisma.commissionRecord.findUnique({ where: { orderId } });
        if (existing) {
            // Add delivery portion on top of the confirmation portion already recorded
            await prisma.commissionRecord.update({
                where: { orderId },
                data: { amount: existing.amount + deliverAmount, updatedAt: new Date() }
            });
            broadcastEvent(SSE_EVENTS.COMMISSION_CHANGED, { agentId: confirmedById });
        } else {
            // Confirmation happened before split mode was enabled — create record for delivery portion only
            await upsertRecord(orderId, confirmedById, deliverAmount);
        }
    }
}

// Called when order is CANCELLED or RETOUR
export async function handleCancelCommission(orderId: string): Promise<void> {
    const settings = await getCommissionSettings();
    const policy = settings.commissionCancelPolicy;

    if (policy === 'keep') return; // commission is never revoked

    if (policy === 'cancel_on_return') {
        await prisma.commissionRecord.updateMany({
            where: { orderId, status: 'PENDING' },
            data: { status: 'CANCELLED' }
        });
        broadcastEvent(SSE_EVENTS.COMMISSION_CHANGED);
        return;
    }

    if (policy === 'grace_period') {
        const record = await prisma.commissionRecord.findUnique({ where: { orderId } });
        if (!record) return;
        const graceEnd = new Date(record.createdAt);
        graceEnd.setDate(graceEnd.getDate() + settings.commissionGraceDays);
        if (new Date() <= graceEnd) {
            await prisma.commissionRecord.update({
                where: { id: record.id },
                data: { status: 'CANCELLED' }
            });
            broadcastEvent(SSE_EVENTS.COMMISSION_CHANGED);
        }
        // Outside grace window → commission kept silently
    }
}
