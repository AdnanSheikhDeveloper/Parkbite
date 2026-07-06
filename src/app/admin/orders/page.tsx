import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { getISTDate } from '@/lib/date-utils';
import OrdersDashboardClient from './OrdersDashboardClient';

export const revalidate = 0;

interface SearchParams {
  page?: string;
  window?: string;
  status?: string;
  paymentStatus?: string;
  search?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const isAuth = await isAdminAuthenticated();
  
  if (!isAuth) {
    redirect('/admin');
  }

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const limit = 10;
  const skip = (page - 1) * limit;

  const filterWindow = params.window || 'ALL';
  const filterStatus = params.status || 'ALL';
  const filterPaymentStatus = params.paymentStatus || 'ALL';
  const searchString = (params.search || '').trim();

  let ordersSerialized: any[] = [];
  let totalCount = 0;
  let morningCount = 0;
  let morningTotal = 0;
  let afternoonCount = 0;
  let afternoonTotal = 0;
  let dbError = false;

  try {
    // 1. Calculate today's start in UTC to query today's active window summaries
    const todayIST = getISTDate();
    const todayStartIST = new Date(Date.UTC(todayIST.getUTCFullYear(), todayIST.getUTCMonth(), todayIST.getUTCDate(), 0, 0, 0));
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const todayStartUTC = new Date(todayStartIST.getTime() - istOffsetMs);

    // Query active morning orders today/tomorrow cycle
    const todayMorningOrders = await prisma.order.findMany({
      where: {
        deliveryWindow: 'MORNING_11AM',
        status: { not: 'CANCELLED' },
        createdAt: { gte: todayStartUTC },
      },
      select: { totalAmount: true },
    });
    morningCount = todayMorningOrders.length;
    morningTotal = todayMorningOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    // Query active afternoon orders today/tomorrow cycle
    const todayAfternoonOrders = await prisma.order.findMany({
      where: {
        deliveryWindow: 'AFTERNOON_4PM',
        status: { not: 'CANCELLED' },
        createdAt: { gte: todayStartUTC },
      },
      select: { totalAmount: true },
    });
    afternoonCount = todayAfternoonOrders.length;
    afternoonTotal = todayAfternoonOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    // 2. Build dynamic where filter for paginated list
    const where: any = {};

    if (filterWindow !== 'ALL') {
      where.deliveryWindow = filterWindow;
    }

    if (filterStatus !== 'ALL') {
      where.status = filterStatus;
    }

    if (filterPaymentStatus !== 'ALL') {
      where.paymentStatus = filterPaymentStatus;
    }

    if (searchString) {
      where.OR = [
        { id: { contains: searchString, mode: 'insensitive' } },
        { customer: { name: { contains: searchString, mode: 'insensitive' } } },
        { customer: { phone: { contains: searchString, mode: 'insensitive' } } },
        { customer: { company: { contains: searchString, mode: 'insensitive' } } },
      ];
    }

    // 3. Query total count matching filters
    totalCount = await prisma.order.count({ where });

    // 4. Fetch the paginated orders list
    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: true,
        items: {
          include: {
            menuItem: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    ordersSerialized = orders.map((order) => ({
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
  } catch (error) {
    console.error('Error querying paginated admin orders:', error);
    dbError = true;
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return (
    <OrdersDashboardClient
      orders={ordersSerialized}
      currentPage={page}
      totalPages={totalPages}
      totalCount={totalCount}
      morningCount={morningCount}
      morningTotal={morningTotal}
      afternoonCount={afternoonCount}
      afternoonTotal={afternoonTotal}
      filters={{
        window: filterWindow,
        status: filterStatus,
        paymentStatus: filterPaymentStatus,
        search: searchString,
      }}
      dbError={dbError}
    />
  );
}
