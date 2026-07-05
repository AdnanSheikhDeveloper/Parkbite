import { redirect } from 'next/navigation';
import { isRiderAuthenticated } from './actions';
import { prisma } from '@/lib/prisma';
import { getISTDate } from '@/lib/date-utils';
import { generateUPIQRCode } from '@/lib/qrcode';
import RiderDashboardClient from './RiderDashboardClient';
import RiderLoginClient from './RiderLoginClient';

export const revalidate = 0; // Disable static cache

export default async function RiderPage() {
  const isAuth = await isRiderAuthenticated();

  if (!isAuth) {
    return <RiderLoginClient />;
  }

  let morningOrdersSerialized: any[] = [];
  let afternoonOrdersSerialized: any[] = [];
  let dbError = false;

  try {
    // Calculate today's start in UTC to filter completed/delivered orders
    const todayIST = getISTDate();
    const todayStartIST = new Date(Date.UTC(todayIST.getUTCFullYear(), todayIST.getUTCMonth(), todayIST.getUTCDate(), 0, 0, 0));
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const todayStartUTC = new Date(todayStartIST.getTime() - istOffsetMs);

    // Query active morning orders OR completed today
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

    // Query active afternoon orders OR completed today
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

    // Helper to serialize and generate QR codes
    const serializeRiderOrders = async (ordersList: any[]) => {
      const list = [];
      for (const order of ordersList) {
        let qrCodeDataUrl = '';
        if (order.paymentMethod === 'UPI_QR' && order.paymentStatus === 'PENDING') {
          try {
            qrCodeDataUrl = await generateUPIQRCode(Number(order.totalAmount), order.id);
          } catch (e) {
            console.error('Failed to generate QR code for rider screen:', e);
          }
        }
        list.push({
          id: order.id,
          deliveryWindow: order.deliveryWindow,
          status: order.status,
          totalAmount: Number(order.totalAmount),
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          customRequest: order.customRequest,
          createdAt: order.createdAt.toISOString(),
          customer: {
            name: order.customer.name,
            phone: order.customer.phone,
            company: order.customer.company,
          },
          items: order.items.map((item: any) => ({
            id: item.id,
            quantity: item.quantity,
            menuItem: {
              name: item.menuItem.name,
            },
          })),
          qrCodeDataUrl,
        });
      }
      return list;
    };

    morningOrdersSerialized = await serializeRiderOrders(morningOrders);
    afternoonOrdersSerialized = await serializeRiderOrders(afternoonOrders);
  } catch (error) {
    console.error('Error fetching today\'s orders for rider portal:', error);
    dbError = true;
  }

  return (
    <RiderDashboardClient
      initialMorningOrders={morningOrdersSerialized}
      initialAfternoonOrders={afternoonOrdersSerialized}
      dbError={dbError}
    />
  );
}
