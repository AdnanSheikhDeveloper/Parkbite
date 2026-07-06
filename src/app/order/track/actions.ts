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

/**
 * Submits feedback for a delivered order.
 */
export async function submitFeedback(
  orderId: string,
  rating: number,
  comment?: string
): Promise<{ success: boolean; error?: string }> {
  if (!orderId) {
    return { success: false, error: 'Order ID is required' };
  }
  if (rating < 1 || rating > 5) {
    return { success: false, error: 'Rating must be between 1 and 5' };
  }

  try {
    // Check if order exists and if feedback is already submitted
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { feedback: true },
    });

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    if (order.feedback) {
      return { success: false, error: 'Feedback already submitted for this order' };
    }

    await prisma.feedback.create({
      data: {
        orderId,
        rating,
        comment: comment?.trim() || null,
      },
    });

    revalidatePath(`/order/track/${orderId}`);
    return { success: true };
  } catch (err) {
    console.error('Error submitting feedback:', err);
    return { success: false, error: 'Failed to submit feedback' };
  }
}
