import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { getISTDate } from '@/lib/date-utils';
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
    // Calculate today's start in UTC to filter completed orders
    const todayIST = getISTDate();
    const todayStartIST = new Date(Date.UTC(todayIST.getUTCFullYear(), todayIST.getUTCMonth(), todayIST.getUTCDate(), 0, 0, 0));
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const todayStartUTC = new Date(todayStartIST.getTime() - istOffsetMs);

    // Query morning orders (active OR completed today)
    const morningOrders = await prisma.order.findMany({
      where: {
        deliveryWindow: 'MORNING_11AM',
        OR: [
          {
            status: {
              in: ['PLACED', 'PREPARING', 'OUT_FOR_DELIVERY'],
            },
          },
          {
            status: {
              in: ['DELIVERED', 'CANCELLED'],
            },
            statusUpdatedAt: {
              gte: todayStartUTC,
            },
          },
        ],
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

    // Query afternoon orders (active OR completed today)
    const afternoonOrders = await prisma.order.findMany({
      where: {
        deliveryWindow: 'AFTERNOON_4PM',
        OR: [
          {
            status: {
              in: ['PLACED', 'PREPARING', 'OUT_FOR_DELIVERY'],
            },
          },
          {
            status: {
              in: ['DELIVERED', 'CANCELLED'],
            },
            statusUpdatedAt: {
              gte: todayStartUTC,
            },
          },
        ],
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

    const serializeOrders = (ordersList: any[]) => {
      return ordersList.map((order) => ({
        id: order.id,
        deliveryWindow: order.deliveryWindow,
        status: order.status,
        totalAmount: Number(order.totalAmount),
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        upiReferenceNo: order.upiReferenceNo,
        paidBy: order.paidBy,
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
