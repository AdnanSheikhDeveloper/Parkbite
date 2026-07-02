import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import MenuManagerClient from './MenuManagerClient';

export const revalidate = 0;

export default async function AdminMenuPage() {
  const isAuth = await isAdminAuthenticated();
  
  if (!isAuth) {
    redirect('/admin');
  }

  let menuItems = [];
  try {
    const dbItems = await prisma.menuItem.findMany({
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
    console.error('Error fetching menu items for admin:', error);
  }

  return <MenuManagerClient initialMenuItems={menuItems} />;
}
