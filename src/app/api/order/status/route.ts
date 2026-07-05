import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const revalidate = 0; // Disable server cache

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing order ID parameter' }, { status: 400 });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        status: true,
        statusUpdatedAt: true,
        paymentStatus: true,
        paidBy: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Failed to query order status in API route:', error);
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }
}
