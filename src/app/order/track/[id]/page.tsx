import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import TrackOrderClient from './TrackOrderClient';
import { generateUPIQRCode } from '@/lib/qrcode';
import Link from 'next/link';

export const revalidate = 0; // Always fetch fresh status

interface TrackPageProps {
  params: Promise<{ id: string }>;
}

export default async function TrackOrderPage({ params }: TrackPageProps) {
  const { id } = await params;

  let order;
  try {
    order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        feedback: true,
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });
  } catch (error) {
    console.error('Error fetching order for tracking page:', error);
  }

  if (!order) {
    return notFound();
  }

  // Generate UPI QR Code (base64 Data URL) if order exists and payment is PENDING
  let qrCodeDataUrl = '';
  if (order.paymentMethod === 'UPI_QR' && order.paymentStatus === 'PENDING' && Number(order.totalAmount) > 0) {
    try {
      qrCodeDataUrl = await generateUPIQRCode(Number(order.totalAmount), order.id);
    } catch (e) {
      console.error('Failed to generate QR code for tracking page:', e);
    }
  }

  // Serialize decimals and dates for client component safety
  const serializedOrder = {
    id: order.id,
    deliveryWindow: order.deliveryWindow,
    status: order.status,
    totalAmount: Number(order.totalAmount),
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    upiReferenceNo: order.upiReferenceNo,
    paidAt: order.paidAt ? order.paidAt.toISOString() : null,
    paidBy: order.paidBy,
    customRequest: order.customRequest,
    createdAt: order.createdAt.toISOString(),
    statusUpdatedAt: order.statusUpdatedAt.toISOString(),
    feedback: order.feedback ? {
      id: order.feedback.id,
      rating: order.feedback.rating,
      comment: order.feedback.comment,
      createdAt: order.feedback.createdAt.toISOString(),
    } : null,
    customer: {
      name: order.customer.name,
      phone: order.customer.phone,
      company: order.customer.company,
    },
    items: order.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      priceAtOrder: Number(item.priceAtOrder),
      menuItem: {
        name: item.menuItem.name,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-bg-warm flex flex-col">
      {/* Header */}
      <header className="bg-brand-deep text-bg-warm py-4 px-4 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/order" className="text-bg-warm hover:text-brand-accent transition font-semibold text-sm">
              ← Store
            </Link>
            <h1 className="text-xl font-bold">Track Order</h1>
          </div>
        </div>
      </header>

      {/* Main Track Client Wrapper */}
      <main className="flex-grow flex flex-col">
        <TrackOrderClient order={serializedOrder} qrCodeDataUrl={qrCodeDataUrl} />
      </main>
    </div>
  );
}
