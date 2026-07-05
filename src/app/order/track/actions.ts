'use server';

import { prisma } from '@/lib/prisma';
import { PaymentStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';

/**
 * Allows the customer to self-report their payment from the tracking page.
 * This sets paymentStatus to PAID and flags paidBy as 'customer-reported'.
 */
export async function customerSelfReportPayment(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: PaymentStatus.PAID,
        paidBy: 'customer-reported',
        paidAt: new Date(),
      },
    });

    revalidatePath(`/order/track/${orderId}`);
    revalidatePath('/admin/orders');
    return { success: true };
  } catch (error) {
    console.error('Failed customer self-reporting payment:', error);
    return { success: false, error: 'Database error logging self-reported payment' };
  }
}
