import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function checkDb() {
  console.log('--- DIAGNOSTIC: CHECKING ORDERS IN DATABASE ---');
  try {
    const ordersCount = await prisma.order.count();
    console.log(`Total orders in DB: ${ordersCount}`);

    const orders = await prisma.order.findMany({
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
      take: 5,
    });

    console.log('Last 5 orders in DB:');
    orders.forEach((o) => {
      console.log(`- ID: ${o.id}, Status: ${o.status}, Window: ${o.deliveryWindow}, CreatedAt: ${o.createdAt.toISOString()}, Total: ${o.totalAmount}, Customer: ${o.customer?.name || 'None'}`);
    });
  } catch (error) {
    console.error('Error querying database:', error);
  }
  process.exit(0);
}

checkDb();
