'use server';

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';

/**
 * Logs in the rider by verifying the passcode and setting an HTTP-only cookie.
 */
export async function loginRider(code: string): Promise<{ success: boolean; error?: string }> {
  const expectedCode = process.env.RIDER_ACCESS_CODE || 'rider123';

  if (code === expectedCode) {
    const cookieStore = await cookies();
    cookieStore.set('rider_session', code, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
    return { success: true };
  }

  return { success: false, error: 'Incorrect rider access code' };
}

/**
 * Logs out the rider.
 */
export async function logoutRider(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('rider_session');
}

/**
 * Checks if the rider is authenticated.
 */
export async function isRiderAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get('rider_session')?.value;
  const expectedCode = process.env.RIDER_ACCESS_CODE || 'rider123';
  return sessionValue === expectedCode;
}

/**
 * Allows the rider to mark an order as delivered.
 */
export async function riderMarkDelivered(orderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.DELIVERED,
      },
    });

    revalidatePath('/rider');
    revalidatePath(`/order/track/${orderId}`);
    revalidatePath('/admin/orders');
    return { success: true };
  } catch (error) {
    console.error('Rider failed to mark order delivered:', error);
    return { success: false, error: 'Database error updating delivery status' };
  }
}

/**
 * Allows the rider to mark an order as paid (either cash received or UPI verified).
 */
export async function riderConfirmPayment(
  orderId: string,
  upiReferenceNo?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: PaymentStatus.PAID,
        paidBy: 'rider',
        paidAt: new Date(),
        upiReferenceNo: upiReferenceNo || null,
      },
    });

    revalidatePath('/rider');
    revalidatePath(`/order/track/${orderId}`);
    revalidatePath('/admin/orders');
    return { success: true };
  } catch (error) {
    console.error('Rider failed to confirm payment:', error);
    return { success: false, error: 'Database error updating payment status' };
  }
}

/**
 * Allows the rider to update the order price.
 */
export async function riderUpdateOrderPrice(
  orderId: string,
  newPrice: number
): Promise<{ success: boolean; error?: string }> {
  try {
    if (newPrice < 0) {
      return { success: false, error: 'Price cannot be negative' };
    }
    await prisma.order.update({
      where: { id: orderId },
      data: { totalAmount: newPrice },
    });
    revalidatePath('/rider');
    revalidatePath('/admin/orders');
    revalidatePath(`/order/track/${orderId}`);
    return { success: true };
  } catch (error) {
    console.error('Rider failed to update order price:', error);
    return { success: false, error: 'Database error updating price' };
  }
}

/**
 * Allows the rider to update the order status.
 */
export async function riderUpdateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus },
    });
    revalidatePath('/rider');
    revalidatePath('/admin/orders');
    revalidatePath(`/order/track/${orderId}`);
    return { success: true };
  } catch (error) {
    console.error('Rider failed to update order status:', error);
    return { success: false, error: 'Database error updating status' };
  }
}
