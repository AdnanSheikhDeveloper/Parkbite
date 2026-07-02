import { PrismaClient, Category } from '@prisma/client';

const prisma = new PrismaClient();

const startingItems = [
  { name: 'Samosa', category: Category.SNACKS, costPrice: 10, sellPrice: 15 },
  { name: 'Kachori', category: Category.SNACKS, costPrice: 12, sellPrice: 17 },
  { name: 'Chai', category: Category.BEVERAGES, costPrice: 8, sellPrice: 12 },
  { name: 'Maggi Noodles', category: Category.QUICK_MEALS, costPrice: 25, sellPrice: 35 },
  { name: 'Chowmein', category: Category.CHINESE, costPrice: 40, sellPrice: 55 },
  { name: 'Veg Manchurian', category: Category.CHINESE, costPrice: 40, sellPrice: 55 },
];

async function main() {
  console.log('Seeding starting menu items...');
  for (const item of startingItems) {
    const existing = await prisma.menuItem.findFirst({
      where: { name: item.name },
    });
    if (existing) {
      await prisma.menuItem.update({
        where: { id: existing.id },
        data: {
          costPrice: item.costPrice,
          sellPrice: item.sellPrice,
          category: item.category,
        },
      });
      console.log(`Updated: ${item.name}`);
    } else {
      await prisma.menuItem.create({
        data: {
          name: item.name,
          category: item.category,
          costPrice: item.costPrice,
          sellPrice: item.sellPrice,
          isAvailable: true,
        },
      });
      console.log(`Created: ${item.name}`);
    }
  }
  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
