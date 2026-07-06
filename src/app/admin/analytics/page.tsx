import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import AnalyticsClient from './AnalyticsClient';

export const revalidate = 0; // Always fetch fresh metrics

interface SearchParams {
  startDate?: string;
  endDate?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const isAuth = await isAdminAuthenticated();
  
  if (!isAuth) {
    redirect('/admin');
  }

  const params = await searchParams;
  const now = new Date();
  
  // Default range: last 7 days
  const defaultStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  defaultStart.setHours(0, 0, 0, 0);
  const defaultEnd = new Date(now.getTime());
  defaultEnd.setHours(23, 59, 59, 999);

  const start = params.startDate ? new Date(params.startDate) : defaultStart;
  const end = params.endDate ? new Date(params.endDate) : defaultEnd;

  let dailyRevenue: { date: string; amount: number }[] = [];
  let topItems: { name: string; quantity: number }[] = [];
  let windowStats: { MORNING_11AM: number; AFTERNOON_4PM: number } = { MORNING_11AM: 0, AFTERNOON_4PM: 0 };
  let feedbackRating = 0;
  let feedbackCount = 0;
  let repeatOrderRate = 0;
  let totalActiveCustomersCount = 0;
  let repeatCustomersCount = 0;
  let dbError = false;

  try {
    // 1. Daily revenue: PAID orders over selected range
    const paidOrders = await prisma.order.findMany({
      where: {
        paymentStatus: 'PAID',
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        createdAt: true,
        totalAmount: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const revenueByDay: Record<string, number> = {};
    paidOrders.forEach((o) => {
      // Group by local Date in India (IST)
      const dateStr = o.createdAt.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
      });
      revenueByDay[dateStr] = (revenueByDay[dateStr] || 0) + Number(o.totalAmount);
    });

    dailyRevenue = Object.entries(revenueByDay).map(([date, amount]) => ({
      date,
      amount,
    }));

    // 2. Top-selling items: non-cancelled items over selected range
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: {
            gte: start,
            lte: end,
          },
          status: {
            not: 'CANCELLED',
          },
        },
      },
      include: {
        menuItem: true,
      },
    });

    const itemsCount: Record<string, { name: string; quantity: number }> = {};
    orderItems.forEach((oi) => {
      const itemId = oi.menuItemId;
      if (!itemsCount[itemId]) {
        itemsCount[itemId] = { name: oi.menuItem.name, quantity: 0 };
      }
      itemsCount[itemId].quantity += oi.quantity;
    });

    topItems = Object.values(itemsCount)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // 3. Order volume by delivery window
    const ordersByWindow = await prisma.order.groupBy({
      by: ['deliveryWindow'],
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
        status: {
          not: 'CANCELLED',
        },
      },
      _count: {
        id: true,
      },
    });

    ordersByWindow.forEach((group) => {
      if (group.deliveryWindow === 'MORNING_11AM') {
        windowStats.MORNING_11AM = group._count.id;
      } else if (group.deliveryWindow === 'AFTERNOON_4PM') {
        windowStats.AFTERNOON_4PM = group._count.id;
      }
    });

    // 4. Average feedback rating & count
    const feedbackStats = await prisma.feedback.aggregate({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      _avg: {
        rating: true,
      },
      _count: {
        id: true,
      },
    });

    feedbackRating = feedbackStats._avg.rating ? Number(feedbackStats._avg.rating.toFixed(1)) : 0;
    feedbackCount = feedbackStats._count.id;

    // 5. Repeat-order rate: customers placing >= 3 orders in any rolling 7-day period
    // First, find all customers with at least 1 order in the selected range
    const activeOrdersInRange = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
        status: {
          not: 'CANCELLED',
        },
      },
      include: {
        customer: true,
      },
    });

    const activeCustomerIds = new Set<string>();
    activeOrdersInRange.forEach((o) => {
      activeCustomerIds.add(o.customerId);
    });

    totalActiveCustomersCount = activeCustomerIds.size;

    if (totalActiveCustomersCount > 0) {
      // Fetch full order history of these active customers to evaluate the rolling 7-day window condition
      const allOrdersOfActiveCustomers = await prisma.order.findMany({
        where: {
          customerId: {
            in: Array.from(activeCustomerIds),
          },
          status: {
            not: 'CANCELLED',
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      const customerOrdersMap: Record<string, Date[]> = {};
      allOrdersOfActiveCustomers.forEach((o) => {
        if (!customerOrdersMap[o.customerId]) {
          customerOrdersMap[o.customerId] = [];
        }
        customerOrdersMap[o.customerId].push(new Date(o.createdAt));
      });

      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      Object.values(customerOrdersMap).forEach((dates) => {
        if (dates.length < 3) return;

        let hasRepeatSet = false;
        for (let i = 0; i <= dates.length - 3; i++) {
          const firstOrderTime = dates[i].getTime();
          const thirdOrderTime = dates[i + 2].getTime();
          if (thirdOrderTime - firstOrderTime <= SEVEN_DAYS_MS) {
            hasRepeatSet = true;
            break;
          }
        }
        if (hasRepeatSet) {
          repeatCustomersCount++;
        }
      });

      repeatOrderRate = Math.round((repeatCustomersCount / totalActiveCustomersCount) * 100);
    }
  } catch (err) {
    console.error('Error fetching analytics metrics:', err);
    dbError = true;
  }

  return (
    <AnalyticsClient
      initialStartDate={start.toISOString().split('T')[0]}
      initialEndDate={end.toISOString().split('T')[0]}
      dailyRevenue={dailyRevenue}
      topItems={topItems}
      windowStats={windowStats}
      feedbackRating={feedbackRating}
      feedbackCount={feedbackCount}
      repeatOrderRate={repeatOrderRate}
      totalActiveCustomers={totalActiveCustomersCount}
      repeatCustomersCount={repeatCustomersCount}
      dbError={dbError}
    />
  );
}
