import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft, Clock, MapPin, RefreshCw, ShoppingBag } from 'lucide-react';
import { OrderStatus } from '@prisma/client';

export const revalidate = 0; // Disable cache so status is fetched fresh on reload

interface TrackPageProps {
  params: Promise<{ id: string }>;
}

const STATUS_STEPS = [
  { status: OrderStatus.PLACED, label: 'Placed' },
  { status: OrderStatus.PREPARING, label: 'Preparing' },
  { status: OrderStatus.OUT_FOR_DELIVERY, label: 'Out for delivery' },
  { status: OrderStatus.DELIVERED, label: 'Delivered' },
];

export default async function TrackOrderPage({ params }: TrackPageProps) {
  const { id } = await params;

  let order;
  try {
    order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });
  } catch (error) {
    console.error('Error fetching order for tracking:', error);
  }

  if (!order) {
    return notFound();
  }

  // Find the index of the current status in our status steps
  const currentStepIndex = STATUS_STEPS.findIndex((step) => step.status === order.status);
  const isCancelled = order.status === OrderStatus.CANCELLED;

  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-bg-warm flex flex-col">
      {/* Header */}
      <header className="bg-brand-deep text-bg-warm py-4 px-4 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/order" className="text-bg-warm hover:text-brand-accent transition">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-bold">Track Order</h1>
          </div>
          {/* Manual Refresh Indicator */}
          <Link
            href={`/order/track/${id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-warm/10 rounded-lg text-xs font-semibold hover:bg-bg-warm/20 transition text-bg-warm"
          >
            <RefreshCw size={14} className="animate-pulse" />
            Refresh
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-8 w-full flex-grow flex flex-col gap-6">
        
        {/* Status Card */}
        <div className="bg-white p-6 rounded-xl border border-brand-deep/5 shadow-xs flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-brand-deep/5 pb-4 gap-2">
            <div>
              <p className="text-xs opacity-60 font-semibold uppercase tracking-wider">Order ID</p>
              <h2 className="text-md font-bold text-brand-deep">{order.id}</h2>
            </div>
            <div className="text-left md:text-right">
              <p className="text-xs opacity-60 font-semibold uppercase tracking-wider">Placed On</p>
              <p className="font-semibold text-brand-deep">{formattedDate}</p>
            </div>
          </div>

          {/* Status Indicator */}
          {isCancelled ? (
            <div className="bg-alert/15 border border-alert text-alert p-4 rounded-lg text-center font-bold text-sm">
              This order has been cancelled.
            </div>
          ) : (
            <div className="py-4">
              <div className="relative flex items-center justify-between">
                {/* Connecting Line */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-brand-deep/10 z-0" />
                
                {/* Active Line Fill */}
                <div 
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-brand-accent z-0 transition-all duration-500" 
                  style={{
                    width: `${currentStepIndex >= 0 ? (currentStepIndex / (STATUS_STEPS.length - 1)) * 100 : 0}%`
                  }}
                />

                {STATUS_STEPS.map((step, index) => {
                  const isDone = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;

                  return (
                    <div key={step.status} className="relative z-10 flex flex-col items-center gap-2">
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all duration-300 ${
                          isDone 
                            ? 'bg-brand-accent border-brand-accent text-bg-warm shadow-md' 
                            : 'bg-white border-brand-deep/20 text-brand-deep/50'
                        } ${isCurrent ? 'ring-4 ring-brand-accent/25 scale-110' : ''}`}
                      >
                        {index + 1}
                      </div>
                      <span className={`text-[10px] md:text-xs font-bold text-center ${
                        isDone ? 'text-brand-deep' : 'text-brand-deep/40'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Live tracking footnote */}
          {/* Note: live status updates (via WebSockets/polling) are a later phase. Manual refresh is fine for now. */}
          <p className="text-[10px] text-ink/40 text-center italic border-t border-brand-deep/5 pt-4">
            * Live tracking is in development. Please refresh this page to see the latest status.
          </p>
        </div>

        {/* Order Details & Summary Card */}
        <div className="bg-white p-6 rounded-xl border border-brand-deep/5 shadow-xs flex flex-col gap-5">
          <h3 className="text-md font-bold text-brand-deep border-b border-brand-deep/10 pb-2 flex items-center gap-2">
            <ShoppingBag size={18} className="text-brand-accent" />
            Order Details
          </h3>

          {/* Customer Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-bg-warm/35 p-4 rounded-lg border border-brand-deep/5 text-sm">
            <div className="flex items-start gap-2.5">
              <MapPin size={16} className="text-brand-accent shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-brand-deep">{order.customer.name}</p>
                <p className="text-xs opacity-75">{order.customer.company}</p>
                <p className="text-xs opacity-75 mt-0.5">Phone: +91 {order.customer.phone}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Clock size={16} className="text-brand-accent shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-brand-deep">Delivery Window</p>
                <p className="text-xs opacity-75">
                  {order.deliveryWindow === 'MORNING_11AM' ? 'Morning 11:00 AM Window' : 'Afternoon 4:00 PM Window'}
                </p>
                <p className="text-xs opacity-60 mt-0.5">Payment: {order.paymentMethod === 'UPI_ON_DELIVERY' ? 'UPI on Delivery' : 'Cash on Delivery'}</p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="flex flex-col gap-3.5">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-sm">
                <div>
                  <span className="font-medium text-brand-deep">{item.menuItem.name}</span>
                  <span className="text-xs opacity-60 ml-2">x{item.quantity}</span>
                </div>
                <span className="font-semibold text-brand-deep">₹{Number(item.priceAtOrder) * item.quantity}</span>
              </div>
            ))}
          </div>

          {/* Custom request */}
          {order.customRequest && (
            <div className="bg-bg-warm/10 p-3 rounded-lg border border-brand-deep/5 text-xs">
              <p className="font-semibold text-brand-deep">Your Custom Request:</p>
              <p className="italic opacity-85 mt-0.5">"{order.customRequest}"</p>
            </div>
          )}

          {/* Total */}
          <div className="border-t border-brand-deep/10 pt-4 flex justify-between items-center font-bold text-brand-deep">
            <span>Grand Total Paid/Owed</span>
            <span>₹{Number(order.totalAmount)}</span>
          </div>
        </div>

        <Link
          href="/order"
          className="py-3 bg-brand-deep hover:bg-brand-deep/90 text-bg-warm font-bold text-center rounded-lg shadow-sm transition"
        >
          Go Back to Menu
        </Link>
      </main>
    </div>
  );
}
