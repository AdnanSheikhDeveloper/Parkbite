'use server';

import { prisma } from '@/lib/prisma';
import { isWindowOpen } from '@/lib/date-utils';
import { DeliveryWindow, PaymentMethod, OrderStatus, PaymentStatus } from '@prisma/client';

export interface PlaceOrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
}

export async function placeOrder(formData: {
  name: string;
  phone: string;
  companyAndFloor: string;
  deliveryWindow: 'MORNING_11AM' | 'AFTERNOON_4PM';
  targetDate: string;
  paymentMethod: 'CASH' | 'UPI_QR';
  customRequest?: string;
  items: { menuItemId: string; quantity: number }[];
}): Promise<PlaceOrderResult> {
  // 1. Basic validation
  if (!formData.name || !formData.name.trim()) {
    return { success: false, error: 'Name is required' };
  }
  if (!formData.companyAndFloor || !formData.companyAndFloor.trim()) {
    return { success: false, error: 'Company and floor details are required' };
  }
  
  const cleanPhone = formData.phone.trim().replace(/\D/g, '');
  if (cleanPhone.length !== 10) {
    return { success: false, error: 'Phone number must be exactly 10 digits' };
  }
  
  if (!formData.items || formData.items.length === 0) {
    return { success: false, error: 'Your cart is empty' };
  }

  // 2. Strict Cutoff validation with exact PRD copy
  const isOpen = isWindowOpen(formData.targetDate, formData.deliveryWindow);
  if (!isOpen) {
    if (formData.deliveryWindow === 'MORNING_11AM') {
      return {
        success: false,
        error: 'Orders for 11:00 AM closed at 10:00 AM — the 4:00 PM window is open until 3:00 PM.',
      };
    } else {
      return {
        success: false,
        error: 'Orders for 4:00 PM closed at 3:00 PM — the 11:00 AM window is open until 10:00 AM tomorrow.',
      };
    }
  }

  try {
    // 3. Resolve Customer (create or reuse by phone number)
    let customer = await prisma.customer.findUnique({
      where: { phone: cleanPhone },
    });

    if (customer) {
      // Update name/company details if changed
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: formData.name,
          company: formData.companyAndFloor,
        },
      });
    } else {
      customer = await prisma.customer.create({
        data: {
          name: formData.name,
          phone: cleanPhone,
          company: formData.companyAndFloor,
        },
      });
    }

    // 4. Fetch menu items to verify availability and prices
    const itemIds = formData.items.map((i) => i.menuItemId);
    const dbMenuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: itemIds },
        isAvailable: true,
      },
    });

    if (dbMenuItems.length !== itemIds.length) {
      return { success: false, error: 'Some items in your cart are no longer available.' };
    }

    // 5. Calculate total and prepare order items
    let totalAmount = 0;
    const orderItemsToCreate = formData.items.map((item) => {
      const dbItem = dbMenuItems.find((m) => m.id === item.menuItemId)!;
      const sellPrice = Number(dbItem.sellPrice);
      totalAmount += sellPrice * item.quantity;
      return {
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        priceAtOrder: dbItem.sellPrice,
      };
    });

    // 6. Save order inside a transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          customerId: customer!.id,
          deliveryWindow: formData.deliveryWindow as DeliveryWindow,
          status: OrderStatus.PLACED,
          totalAmount: totalAmount,
          paymentMethod: formData.paymentMethod as PaymentMethod,
          paymentStatus: PaymentStatus.PENDING,
          customRequest: formData.customRequest || null,
          items: {
            create: orderItemsToCreate,
          },
        },
      });
      return newOrder;
    });

    return { success: true, orderId: order.id };
  } catch (error) {
    console.error('Error placing order in server action:', error);
    return { success: false, error: 'Internal server error while placing order. Please try again.' };
  }
}
