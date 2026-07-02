import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { getDeliveryIntervals } from '@/lib/date-utils';
import OrdersDashboardClient from './OrdersDashboardClient';

export const revalidate = 0;

export default async function AdminOrdersPage() {
  const isAuth = await isAdminAuthenticated();
  
  if (!isAuth) {
    redirect('/admin');
  }

  let morningOrdersSerialized: any[] = [];
  let afternoonOrdersSerialized: any[] = [];
  let dbError = false;

  try {
    const { morningStart, morningEnd, afternoonStart, afternoonEnd } = getDeliveryIntervals();

    // Query morning orders
    const morningOrders = await prisma.order.findMany({
      where: {
        deliveryWindow: 'MORNING_11AM',
        createdAt: {
          gte: morningStart,
          lt: morningEnd,
        },
      },
      include: {
        customer: true,
        items: {
          include: {
            menuItem: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Query afternoon orders
    const afternoonOrders = await prisma.order.findMany({
      where: {
        deliveryWindow: 'AFTERNOON_4PM',
        createdAt: {
          gte: afternoonStart,
          lt: afternoonEnd,
        },
      },
      include: {
        customer: true,
        items: {
          include: {
            menuItem: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Helper to serialize decimal and dates
    const serializeOrders = (ordersList: any[]) => {
      return ordersList.map((order) => ({
        id: order.id,
        deliveryWindow: order.deliveryWindow,
        status: order.status,
        totalAmount: Number(order.totalAmount),
        paymentMethod: order.paymentMethod,
        customRequest: order.customRequest,
        createdAt: order.createdAt.toISOString(),
        customer: {
          id: order.customer.id,
          name: order.customer.name,
          phone: order.customer.phone,
          company: order.customer.company,
        },
        items: order.items.map((item: any) => ({
          id: item.id,
          quantity: item.quantity,
          priceAtOrder: Number(item.priceAtOrder),
          menuItem: {
            id: item.menuItem.id,
            name: item.menuItem.name,
            sellPrice: Number(item.menuItem.sellPrice),
          },
        })),
      }));
    };

    morningOrdersSerialized = serializeOrders(morningOrders);
    afternoonOrdersSerialized = serializeOrders(afternoonOrders);
  } catch (error) {
    console.error('Error fetching today\'s orders for admin dashboard:', error);
    dbError = true;
  }

  return (
    <OrdersDashboardClient
      initialMorningOrders={morningOrdersSerialized}
      initialAfternoonOrders={afternoonOrdersSerialized}
      dbError={dbError}
    />
  );
}
