'use server';

import { prisma } from '@/lib/prisma';
import { Category } from '@prisma/client';
import { revalidatePath } from 'next/cache';

/**
 * Adds a new item to the menu.
 * Cost price is automatically estimated at 70% of the selling price.
 */
export async function addMenuItem(data: {
  name: string;
  sellPrice: number;
  category: 'SNACKS' | 'BEVERAGES' | 'QUICK_MEALS' | 'CHINESE' | 'CUSTOM';
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!data.name.trim()) return { success: false, error: 'Name is required' };
    if (data.sellPrice <= 0) return { success: false, error: 'Price must be greater than zero' };

    const estimatedCostPrice = Number((data.sellPrice * 0.7).toFixed(2));

    await prisma.menuItem.create({
      data: {
        name: data.name,
        category: data.category as Category,
        sellPrice: data.sellPrice,
        costPrice: estimatedCostPrice,
        isAvailable: true,
      },
    });

    revalidatePath('/admin/menu');
    revalidatePath('/order');
    return { success: true };
  } catch (error) {
    console.error('Failed to add menu item:', error);
    return { success: false, error: 'Database error adding menu item' };
  }
}

/**
 * Updates the selling price (and estimates the cost price accordingly).
 */
export async function updateMenuItemPrice(
  id: string, 
  sellPrice: number
): Promise<{ success: boolean; error?: string }> {
  try {
    if (sellPrice <= 0) return { success: false, error: 'Price must be greater than zero' };
    
    const estimatedCostPrice = Number((sellPrice * 0.7).toFixed(2));

    await prisma.menuItem.update({
      where: { id },
      data: {
        sellPrice,
        costPrice: estimatedCostPrice,
      },
    });

    revalidatePath('/admin/menu');
    revalidatePath('/order');
    return { success: true };
  } catch (error) {
    console.error('Failed to update menu item price:', error);
    return { success: false, error: 'Database error updating price' };
  }
}

/**
 * Toggles whether a menu item is available for customer ordering.
 */
export async function toggleMenuItemAvailability(
  id: string, 
  isAvailable: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.menuItem.update({
      where: { id },
      data: { isAvailable },
    });

    revalidatePath('/admin/menu');
    revalidatePath('/order');
    return { success: true };
  } catch (error) {
    console.error('Failed to toggle menu item availability:', error);
    return { success: false, error: 'Database error toggling availability' };
  }
}

/**
 * Deletes a menu item from the system.
 */
export async function deleteMenuItem(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.menuItem.delete({
      where: { id },
    });

    revalidatePath('/admin/menu');
    revalidatePath('/order');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete menu item:', error);
    return { success: false, error: 'Database error deleting item. It might be linked to existing orders.' };
  }
}
