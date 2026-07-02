'use server';

import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  [OrderStatus.PLACED]: OrderStatus.PREPARING,
  [OrderStatus.PREPARING]: OrderStatus.OUT_FOR_DELIVERY,
  [OrderStatus.OUT_FOR_DELIVERY]: OrderStatus.DELIVERED,
  [OrderStatus.DELIVERED]: null,
  [OrderStatus.CANCELLED]: null,
};

/**
 * Advances the order status to the next logical step.
 */
export async function advanceOrderStatus(
  orderId: string, 
  currentStatus: OrderStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const nextStatus = NEXT_STATUS[currentStatus];
    if (!nextStatus) {
      return { success: false, error: 'Order is already delivered or cancelled.' };
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status: nextStatus },
    });

    revalidatePath('/admin/orders');
    revalidatePath(`/order/track/${orderId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to advance order status:', error);
    return { success: false, error: 'Database error updating status' };
  }
}

/**
 * Cancels an order.
 */
export async function cancelOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED },
    });

    revalidatePath('/admin/orders');
    revalidatePath(`/order/track/${orderId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to cancel order:', error);
    return { success: false, error: 'Database error cancelling order' };
  }
}
