import { prisma } from '@/lib/prisma';
import OrderClient from './OrderClient';
import { getAvailableWindows } from '@/lib/date-utils';

export const revalidate = 0; // Always fetch fresh data

export default async function OrderPage() {
  let menuItems: any[] = [];
  let dbError = false;

  try {
    const dbItems = await prisma.menuItem.findMany({
      where: {
        isAvailable: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    menuItems = dbItems.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      costPrice: Number(item.costPrice),
      sellPrice: Number(item.sellPrice),
      isAvailable: item.isAvailable,
      imageUrl: item.imageUrl,
    }));
  } catch (error) {
    console.error('Error fetching menu items from database:', error);
    dbError = true;
  }

  const windows = getAvailableWindows();

  return (
    <div className="min-h-screen bg-bg-warm">
      <OrderClient 
        initialMenuItems={menuItems} 
        initialWindows={windows} 
        dbError={dbError}
      />
    </div>
  );
}
