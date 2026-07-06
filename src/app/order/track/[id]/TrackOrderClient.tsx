'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShoppingBag, Clock, MapPin, Check, RefreshCw, AlertCircle, Info, Landmark } from 'lucide-react';
import Link from 'next/link';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { customerSelfReportPayment } from '../actions';
import { submitFeedback } from '../actions';

interface MenuItem {
  name: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  priceAtOrder: number;
  menuItem: MenuItem;
}

interface Order {
  id: string;
  deliveryWindow: 'MORNING_11AM' | 'AFTERNOON_4PM';
  status: OrderStatus;
  totalAmount: number;
  paymentMethod: 'CASH' | 'UPI_QR';
  paymentStatus: PaymentStatus;
  upiReferenceNo: string | null;
  paidAt: string | null;
  paidBy: string | null;
  customRequest: string | null;
  createdAt: string;
  statusUpdatedAt: string;
  customer: {
    name: string;
    phone: string;
    company: string | null;
  };
  items: OrderItem[];
  feedback?: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
  } | null;
}

interface TrackOrderClientProps {
  order: Order;
  qrCodeDataUrl: string;
}

const STATUS_STEPS = [
  { status: OrderStatus.PLACED, label: 'Placed' },
  { status: OrderStatus.PREPARING, label: 'Preparing' },
  { status: OrderStatus.OUT_FOR_DELIVERY, label: 'Out for delivery' },
  { status: OrderStatus.DELIVERED, label: 'Delivered' },
];

export default function TrackOrderClient({ order, qrCodeDataUrl }: TrackOrderClientProps) {
  const searchParams = useSearchParams();
  const isNew = searchParams.get('new') === 'true';

  // Live polled states
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [statusUpdatedAt, setStatusUpdatedAt] = useState<string>(order.statusUpdatedAt);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(order.paymentStatus);
  const [paidBy, setPaidBy] = useState<string | null>(order.paidBy);
  const [isPollerLoading, setIsPollerLoading] = useState(false);

  // Time ticker state to trigger relative time re-renders
  const [timeTicker, setTimeTicker] = useState(0);

  // Customer self-report loading state
  const [isSelfReporting, setIsSelfReporting] = useState(false);

  // Poll status every 15 seconds
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        setIsPollerLoading(true);
        const res = await fetch(`/api/order/status?id=${order.id}`);
        if (res.ok) {
          const data = await res.json();
          setStatus(data.status);
          setStatusUpdatedAt(data.statusUpdatedAt);
          setPaymentStatus(data.paymentStatus);
          setPaidBy(data.paidBy);
        }
      } catch (err) {
        console.error('Failed to poll order status:', err);
      } finally {
        setIsPollerLoading(false);
      }
    }, 15000);

    return () => clearInterval(pollInterval);
  }, [order.id]);

  // Relative time ticker update (every 60 seconds)
  useEffect(() => {
    const tickerInterval = setInterval(() => {
      setTimeTicker((prev) => prev + 1);
    }, 60000);

    return () => clearInterval(tickerInterval);
  }, []);

  const getRelativeTimeString = (dateStr: string): string => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'updated just now';
    if (diffMins === 1) return 'updated 1 minute ago';
    if (diffMins < 60) return `updated ${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return 'updated 1 hour ago';
    if (diffHours < 24) return `updated ${diffHours} hours ago`;
    
    return `updated on ${date.toLocaleDateString()}`;
  };

  const handleSelfReport = async () => {
    if (isSelfReporting) return;
    setIsSelfReporting(true);
    try {
      const res = await customerSelfReportPayment(order.id);
      if (res.success) {
        setPaymentStatus(PaymentStatus.PAID);
        setPaidBy('customer-reported');
      } else {
        alert(res.error || 'Failed to submit payment report');
      }
    } catch (err) {
      console.error(err);
      alert('A network error occurred. Please try again.');
    } finally {
      setIsSelfReporting(false);
    }
  };

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    setIsSubmittingFeedback(true);
    setFeedbackError('');
    try {
      const res = await submitFeedback(order.id, rating, comment);
      if (res.success) {
        setFeedbackSubmitted(true);
      } else {
        setFeedbackError(res.error || 'Failed to submit feedback');
      }
    } catch (err) {
      console.error(err);
      setFeedbackError('An error occurred. Please try again.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Build item summary copy: "Samosa x2, Chai x1"
  const itemSummary = order.items
    .map((item) => `${item.menuItem.name} x${item.quantity}`)
    .join(', ');

  const windowTime = order.deliveryWindow === 'MORNING_11AM' ? '11:00 AM' : '4:00 PM';

  const currentStepIndex = STATUS_STEPS.findIndex((step) => step.status === status);
  const isCancelled = status === OrderStatus.CANCELLED;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 w-full flex-grow flex flex-col gap-6">
      
      {/* 2.7 Voice/Copy Pass: Order confirmed page banner */}
      {isNew && (
        <div className="bg-fresh border-2 border-bg-warm/30 text-bg-warm p-5 rounded-xl shadow-md flex items-start gap-3">
          <Check className="shrink-0 mt-1 ring-2 ring-bg-warm/25 bg-bg-warm/10 rounded-full p-0.5" size={20} />
          <div>
            <h2 className="font-extrabold text-sm md:text-md">Order Placed Successfully!</h2>
            <p className="text-xs md:text-sm mt-1 opacity-90 leading-relaxed font-semibold">
              Order placed. {itemSummary}'s on the way by {windowTime}.
            </p>
          </div>
        </div>
      )}

      {/* Main Status Indicator Card */}
      <div className="bg-white p-6 rounded-xl border border-brand-deep/5 shadow-xs flex flex-col gap-6 relative">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-brand-deep/5 pb-4 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs opacity-60 font-semibold uppercase tracking-wider">Order ID</span>
              {isPollerLoading && <RefreshCw size={12} className="animate-spin text-brand-accent opacity-50" />}
            </div>
            <h2 className="text-md font-bold text-brand-deep">{order.id}</h2>
          </div>
          <div className="text-left md:text-right">
            <p className="text-xs opacity-60 font-semibold uppercase tracking-wider">Delivery Target</p>
            <p className="font-bold text-brand-accent text-sm">
              {order.deliveryWindow === 'MORNING_11AM' ? 'Morning 11:00 AM today/tomorrow' : 'Afternoon 4:00 PM today/tomorrow'}
            </p>
          </div>
        </div>

        {/* Step Indicator */}
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
                const isCompleted = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const isDoneOrCurrent = index <= currentStepIndex;

                return (
                  <div key={step.status} className="relative z-10 flex flex-col items-center gap-2">
                    <div 
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all duration-300 ${
                        isCompleted 
                          ? 'bg-fresh border-fresh text-bg-warm shadow' 
                          : isCurrent
                          ? 'bg-brand-accent border-brand-accent text-bg-warm shadow-md ring-4 ring-brand-accent/20 animate-pulse'
                          : 'bg-white border-brand-deep/20 text-brand-deep/50'
                      }`}
                    >
                      {isCompleted ? <Check size={16} /> : index + 1}
                    </div>
                    <div className="flex flex-col items-center">
                      <span className={`text-[10px] md:text-xs font-bold text-center ${
                        isDoneOrCurrent ? 'text-brand-deep' : 'text-brand-deep/40'
                      }`}>
                        {step.label}
                      </span>
                      {isCurrent && (
                        <span className="text-[8px] md:text-[9px] text-brand-accent font-semibold block mt-0.5 whitespace-nowrap bg-brand-accent/5 px-1 py-0.5 rounded-sm">
                          {getRelativeTimeString(statusUpdatedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-[10px] text-ink/40 text-center italic border-t border-brand-deep/5 pt-4">
          * Live tracking is active. Status updates automatically every 15 seconds.
        </p>
      </div>

      {/* Referral & Feedback Blocks (shown only if status is DELIVERED) */}
      {status === OrderStatus.DELIVERED && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Share / Referral Card */}
          <div className="bg-white p-5 rounded-xl border border-brand-deep/5 shadow-xs flex flex-col justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-brand-deep flex items-center gap-1.5">
                📢 Share with your floor
              </h3>
              <p className="text-xs text-ink/75 mt-1 leading-relaxed">
                Enjoyed your delivery? Share the love with your coworkers on WhatsApp so they can catch the next delivery cutoff!
              </p>
            </div>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Just got ${itemSummary || 'food'} delivered to my desk from ParkBite Express — order before ${
                  new Date().getHours() < 10 ? '10:00 AM' : new Date().getHours() < 15 ? '3:00 PM' : '10:00 AM'
                } at ${typeof window !== 'undefined' ? window.location.origin : ''}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 bg-[#25D366] hover:bg-[#20BA56] text-white font-bold text-center rounded-lg text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Share on WhatsApp
            </a>
          </div>

          {/* Feedback Capture Card */}
          <div className="bg-white p-5 rounded-xl border border-brand-deep/5 shadow-xs flex flex-col justify-between gap-4">
            {feedbackSubmitted || order.feedback ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-4">
                <Check className="text-fresh ring-4 ring-fresh/10 bg-fresh/5 rounded-full p-1 mb-2 animate-none" size={32} />
                <h4 className="font-bold text-brand-deep text-sm">Thanks for your feedback!</h4>
                <p className="text-xs text-ink/60 mt-1">We read every note to make ParkBite even better.</p>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="flex flex-col gap-3">
                <h3 className="text-sm font-bold text-brand-deep">
                  ⭐ How was your food?
                </h3>
                
                {/* Stars container */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 cursor-pointer focus:outline-hidden"
                      aria-label={`Rate ${star} stars`}
                    >
                      <span className={`text-2xl transition ${star <= rating ? 'text-brand-accent' : 'text-brand-deep/15'}`}>
                        ★
                      </span>
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Any comments? (optional)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full p-2 text-xs border border-brand-deep/15 rounded-md focus:border-brand-accent focus:ring-1 focus:ring-brand-accent focus:outline-hidden"
                />

                {feedbackError && (
                  <span className="text-[10px] text-alert font-semibold">{feedbackError}</span>
                )}

                <button
                  type="submit"
                  disabled={rating === 0 || isSubmittingFeedback}
                  className="w-full py-2.5 bg-brand-deep hover:bg-brand-deep/90 disabled:opacity-50 text-bg-warm font-bold rounded-lg text-xs transition cursor-pointer"
                >
                  {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* UPI QR Payment Block (Phase 3 core) */}
      {order.paymentMethod === 'UPI_QR' && (
        <div className="bg-white p-6 rounded-xl border border-brand-deep/5 shadow-xs flex flex-col items-center justify-center gap-5 text-center">
          <h3 className="text-md font-bold text-brand-deep flex items-center gap-2">
            <Landmark size={20} className="text-brand-accent" />
            UPI QR Payment
          </h3>

          {paymentStatus === PaymentStatus.PENDING ? (
            <div className="flex flex-col items-center gap-4 w-full max-w-xs">
              <div className="bg-bg-warm p-4 rounded-2xl border border-brand-deep/10 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={qrCodeDataUrl} 
                  alt="UPI QR Code" 
                  className="w-48 h-48 mx-auto"
                />
              </div>
              
              <div className="text-xs text-brand-deep opacity-80 leading-relaxed font-semibold">
                Scan to pay <span className="text-brand-accent font-extrabold text-sm">₹{order.totalAmount}</span> — or pay cash at delivery.
              </div>

              {/* Customer self-reporting button */}
              <button
                onClick={handleSelfReport}
                disabled={isSelfReporting}
                className="w-full mt-2 py-2 px-4 bg-brand-accent hover:bg-brand-accent/90 disabled:opacity-50 text-bg-warm font-bold rounded-lg text-xs shadow-xs transition"
              >
                {isSelfReporting ? 'Submitting...' : "I've paid"}
              </button>
              <p className="text-[9px] text-ink/40 italic">
                Clicking "I've paid" self-reports transaction to operator. We will verify balance manually.
              </p>
            </div>
          ) : (
            <div className="bg-fresh/15 border border-fresh text-fresh py-4 px-8 rounded-xl font-extrabold text-sm flex items-center gap-2">
              <Check className="ring-2 ring-fresh bg-fresh/10 rounded-full p-0.5" size={16} />
              Paid ✓
              <span className="text-xs opacity-75 font-normal ml-2">
                (Verified by {paidBy === 'customer-reported' ? 'self-report' : paidBy || 'operator'})
              </span>
            </div>
          )}
        </div>
      )}

      {/* Cash Payment notification */}
      {order.paymentMethod === 'CASH' && (
        <div className="bg-white p-5 rounded-xl border border-brand-deep/5 shadow-xs flex items-start gap-3">
          <Info className="text-brand-accent shrink-0 mt-0.5" size={18} />
          <div className="text-xs text-brand-deep">
            <span className="font-bold block">Cash Payment Selected</span>
            <span className="opacity-75">Please pay ₹{order.totalAmount} in cash directly to the delivery person.</span>
          </div>
        </div>
      )}

      {/* Order Summary details */}
      <div className="bg-white p-6 rounded-xl border border-brand-deep/5 shadow-xs flex flex-col gap-5">
        <h3 className="text-md font-bold text-brand-deep border-b border-brand-deep/10 pb-2">
          Order Summary
        </h3>

        {/* Customer Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-bg-warm/35 p-4 rounded-lg border border-brand-deep/5 text-sm">
          <div>
            <span className="text-[10px] opacity-60 uppercase font-bold block mb-1">Customer Details</span>
            <p className="font-semibold text-brand-deep">{order.customer.name}</p>
            <p className="text-xs opacity-75">{order.customer.company}</p>
            <p className="text-xs opacity-75 mt-0.5">Phone: +91 {order.customer.phone}</p>
          </div>
          <div>
            <span className="text-[10px] opacity-60 uppercase font-bold block mb-1">Payment Status</span>
            <p className="font-bold text-brand-deep text-xs uppercase">
              {paymentStatus === PaymentStatus.PAID ? 'Settled (PAID)' : 'PENDING'}
            </p>
            <p className="text-xs opacity-75 mt-1">Method: {order.paymentMethod === 'UPI_QR' ? 'UPI QR' : 'Cash on Delivery'}</p>
          </div>
        </div>

        {/* Items */}
        <div className="flex flex-col gap-3.5">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between items-center text-sm">
              <div>
                <span className="font-medium text-brand-deep">{item.menuItem.name}</span>
                <span className="text-xs opacity-60 ml-2">x{item.quantity}</span>
              </div>
              <span className="font-semibold text-brand-deep">₹{item.priceAtOrder * item.quantity}</span>
            </div>
          ))}
        </div>

        {/* Custom request */}
        {order.customRequest && (
          <div className="bg-bg-warm/15 p-3 rounded-lg border border-brand-deep/5 text-xs">
            <p className="font-semibold text-brand-deep">Custom Requests / Notes:</p>
            <p className="italic opacity-85 mt-0.5 bg-white/50 p-2 rounded-sm border border-brand-deep/5">"{order.customRequest}"</p>
          </div>
        )}

        {/* Total */}
        <div className="border-t border-brand-deep/10 pt-4 flex justify-between items-center font-bold text-brand-deep">
          <span>Grand Total</span>
          <span>₹{order.totalAmount}</span>
        </div>
      </div>

      <Link
        href="/order"
        className="py-3 bg-brand-deep hover:bg-brand-deep/90 text-bg-warm font-bold text-center rounded-lg shadow-sm transition"
      >
        Go Back to Menu
      </Link>
    </div>
  );
}
