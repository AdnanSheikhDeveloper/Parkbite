import "dotenv/config";
import { prisma } from '../src/lib/prisma';

async function testMetrics() {
  console.log('--- Database Metrics Verification ---');

  const totalOrders = await prisma.order.count();
  console.log(`Total orders in DB: ${totalOrders}`);

  const paidOrders = await prisma.order.findMany({
    where: { paymentStatus: 'PAID' },
    select: { totalAmount: true },
  });
  const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  console.log(`Total Revenue (PAID orders): ₹${totalRevenue}`);

  const feedbackStats = await prisma.feedback.aggregate({
    _avg: { rating: true },
    _count: { id: true },
  });
  console.log(`Average Feedback Rating: ${feedbackStats._avg.rating ? feedbackStats._avg.rating.toFixed(2) : 'No reviews'}`);
  console.log(`Total Feedback Count: ${feedbackStats._count.id}`);

  // Calculate repeat customer rate (>= 3 orders in 7-day rolling window)
  const activeOrders = await prisma.order.findMany({
    where: { status: { not: 'CANCELLED' } },
    include: { customer: true },
  });

  const activeCustomerIds = new Set<string>();
  activeOrders.forEach((o) => activeCustomerIds.add(o.customerId));

  let repeatCount = 0;
  if (activeCustomerIds.size > 0) {
    const allOrders = await prisma.order.findMany({
      where: {
        customerId: { in: Array.from(activeCustomerIds) },
        status: { not: 'CANCELLED' },
      },
      orderBy: { createdAt: 'asc' },
    });

    const customerOrdersMap: Record<string, Date[]> = {};
    allOrders.forEach((o) => {
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
        if (dates[i + 2].getTime() - dates[i].getTime() <= SEVEN_DAYS_MS) {
          hasRepeatSet = true;
          break;
        }
      }
      if (hasRepeatSet) repeatCount++;
    });
  }

  const repeatRate = activeCustomerIds.size > 0 
    ? Math.round((repeatCount / activeCustomerIds.size) * 100) 
    : 0;

  console.log(`Repeat Customer Rate: ${repeatRate}% (${repeatCount} of ${activeCustomerIds.size} customers)`);
}

testMetrics()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
