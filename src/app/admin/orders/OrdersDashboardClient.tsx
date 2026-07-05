'use client';

import { useState } from 'react';
import { RefreshCw, MapPin, Check, Truck, Flame, AlertCircle, ShoppingBag, Phone, Ban, Landmark, CheckSquare, Filter } from 'lucide-react';
import AdminHeader from '@/components/AdminHeader';
import { advanceOrderStatus, cancelOrder, adminConfirmPayment } from './actions';
import { OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client';
import { motion, useReducedMotion } from 'framer-motion';

interface Customer {
  id: string;
  name: string;
  phone: string;
  company: string | null;
}

interface OrderItem {
  id: string;
  quantity: number;
  priceAtOrder: number;
  menuItem: {
    id: string;
    name: string;
    sellPrice: number;
  };
}

interface Order {
  id: string;
  deliveryWindow: 'MORNING_11AM' | 'AFTERNOON_4PM';
  status: OrderStatus;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  upiReferenceNo: string | null;
  paidBy: string | null;
  customRequest: string | null;
  createdAt: string;
  customer: Customer;
  items: OrderItem[];
}

interface OrdersDashboardClientProps {
  initialMorningOrders: Order[];
  initialAfternoonOrders: Order[];
  dbError: boolean;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PLACED]: 'Placed',
  [OrderStatus.PREPARING]: 'Preparing',
  [OrderStatus.OUT_FOR_DELIVERY]: 'Out for Delivery',
  [OrderStatus.DELIVERED]: 'Delivered',
  [OrderStatus.CANCELLED]: 'Cancelled',
};

const NEXT_ACTION_LABELS: Record<OrderStatus, string | null> = {
  [OrderStatus.PLACED]: 'Start Preparing',
  [OrderStatus.PREPARING]: 'Send Out for Delivery',
  [OrderStatus.OUT_FOR_DELIVERY]: 'Mark as Delivered',
  [OrderStatus.DELIVERED]: null,
  [OrderStatus.CANCELLED]: null,
};

export default function OrdersDashboardClient({
  initialMorningOrders,
  initialAfternoonOrders,
  dbError,
}: OrdersDashboardClientProps) {
  const [morningOrders, setMorningOrders] = useState<Order[]>(initialMorningOrders);
  const [afternoonOrders, setAfternoonOrders] = useState<Order[]>(initialAfternoonOrders);
  const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({});
  const [showUnpaidOnly, setShowUnpaidOnly] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const shouldReduceMotion = useReducedMotion();

  // Filtering helper
  const getFilteredOrders = (ordersList: Order[]) => {
    if (showUnpaidOnly) {
      return ordersList.filter((o) => o.paymentStatus === PaymentStatus.PENDING);
    }
    return ordersList;
  };

  const morningFiltered = getFilteredOrders(morningOrders);
  const afternoonFiltered = getFilteredOrders(afternoonOrders);

  // Grouping helper
  const getGroupedOrders = (ordersList: Order[]) => {
    const groups: Record<string, Order[]> = {};
    ordersList.forEach((order) => {
      const key = order.customer.company || 'No Company/Floor Info';
      if (!groups[key]) groups[key] = [];
      groups[key].push(order);
    });
    return groups;
  };

  const morningGrouped = getGroupedOrders(morningFiltered);
  const afternoonGrouped = getGroupedOrders(afternoonFiltered);

  // Totals calculations based on ALL active orders (unfiltered)
  const getWindowTotals = (ordersList: Order[]) => {
    const activeOrders = ordersList.filter((o) => o.status !== OrderStatus.CANCELLED);
    const count = activeOrders.length;
    const total = activeOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    return { count, total };
  };

  const morningTotals = getWindowTotals(morningOrders);
  const afternoonTotals = getWindowTotals(afternoonOrders);

  // Status transition handler
  const handleAdvanceStatus = async (
    orderId: string,
    currentStatus: OrderStatus,
    windowType: 'MORNING_11AM' | 'AFTERNOON_4PM'
  ) => {
    setErrorMsg('');
    setUpdatingIds((prev) => ({ ...prev, [orderId]: true }));
    try {
      const result = await advanceOrderStatus(orderId, currentStatus);
      if (result.success) {
        const nextStatusMap: Record<OrderStatus, OrderStatus> = {
          [OrderStatus.PLACED]: OrderStatus.PREPARING,
          [OrderStatus.PREPARING]: OrderStatus.OUT_FOR_DELIVERY,
          [OrderStatus.OUT_FOR_DELIVERY]: OrderStatus.DELIVERED,
          [OrderStatus.DELIVERED]: OrderStatus.DELIVERED,
          [OrderStatus.CANCELLED]: OrderStatus.CANCELLED,
        };
        const nextStatus = nextStatusMap[currentStatus];

        const updater = (prev: Order[]) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o));

        if (windowType === 'MORNING_11AM') setMorningOrders(updater);
        else setAfternoonOrders(updater);
      } else {
        setErrorMsg(result.error || 'Failed to update order status');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to connect to database to update status');
    } finally {
      setUpdatingIds((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  // Cancel order handler
  const handleCancelOrder = async (orderId: string, windowType: 'MORNING_11AM' | 'AFTERNOON_4PM') => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;

    setErrorMsg('');
    setUpdatingIds((prev) => ({ ...prev, [orderId]: true }));
    try {
      const result = await cancelOrder(orderId);
      if (result.success) {
        const updater = (prev: Order[]) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: OrderStatus.CANCELLED } : o));

        if (windowType === 'MORNING_11AM') setMorningOrders(updater);
        else setAfternoonOrders(updater);
      } else {
        setErrorMsg(result.error || 'Failed to cancel order');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to cancel order');
    } finally {
      setUpdatingIds((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  // Reconcile payment manually handler
  const handleConfirmPayment = async (orderId: string, windowType: 'MORNING_11AM' | 'AFTERNOON_4PM') => {
    setErrorMsg('');
    setUpdatingIds((prev) => ({ ...prev, [orderId]: true }));
    try {
      const result = await adminConfirmPayment(orderId);
      if (result.success) {
        const updater = (prev: Order[]) =>
          prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: PaymentStatus.PAID, paidBy: 'admin' } : o));

        if (windowType === 'MORNING_11AM') setMorningOrders(updater);
        else setAfternoonOrders(updater);
      } else {
        setErrorMsg(result.error || 'Failed to confirm payment');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to connect to database to reconcile payment');
    } finally {
      setUpdatingIds((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-bg-warm flex flex-col">
      <AdminHeader />

      <main className="max-w-6xl mx-auto px-4 py-8 flex-grow w-full flex flex-col gap-6">
        {/* Dashboard Title & Actions */}
        <div className="flex justify-between items-center border-b border-brand-deep/10 pb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-brand-deep">Today's Orders Dashboard</h1>
            <p className="text-xs opacity-60 mt-1">Real-time catering logs and office batch packaging dispatch</p>
          </div>
          <motion.button
            whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-4 py-2 border border-brand-deep/10 hover:border-brand-accent bg-white rounded-lg text-xs font-bold text-brand-deep hover:text-brand-accent shadow-xs transition cursor-pointer"
          >
            <RefreshCw size={14} />
            Sync Logs
          </motion.button>
        </div>

        {/* 9. Unpaid Orders Filter Control */}
        <div className="bg-white p-4 rounded-xl border border-brand-deep/5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="flex items-center gap-2.5 text-xs font-extrabold text-brand-deep cursor-pointer">
            <input
              type="checkbox"
              checked={showUnpaidOnly}
              onChange={(e) => setShowUnpaidOnly(e.target.checked)}
              className="accent-brand-accent rounded border-brand-deep/20 w-4 h-4 cursor-pointer"
            />
            <span className="flex items-center gap-1">
              <Filter size={12} className="text-brand-accent" />
              Show Unpaid Orders Only
            </span>
          </label>
          <div className="text-[11px] font-semibold text-brand-deep/60">
            Total active canteens orders listed: {morningOrders.filter(o => o.status !== 'CANCELLED').length + afternoonOrders.filter(o => o.status !== 'CANCELLED').length}
          </div>
        </div>

        {dbError && (
          <div className="bg-alert/15 border border-alert text-ink p-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="text-alert shrink-0 mt-0.5" size={18} />
            <span className="text-xs font-semibold">
              Offline Mode: Connect to database to load actual customer orders.
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="bg-alert/15 border border-alert text-ink p-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="text-alert shrink-0 mt-0.5" size={18} />
            <span className="text-xs font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* 11:00 AM MORNING WINDOW */}
        <section className="flex flex-col gap-4">
          <div className="bg-brand-deep text-bg-warm p-4 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h2 className="font-extrabold text-md uppercase tracking-wider">🌅 Morning Delivery Window</h2>
              <p className="text-xs opacity-75 mt-0.5">Targets 11:00 AM delivery batch</p>
            </div>
            <div className="bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 tabular-nums">
              {morningTotals.count} Orders · ₹{morningTotals.total} Total
            </div>
          </div>

          {morningFiltered.length === 0 ? (
            <div className="bg-white p-8 text-center text-sm opacity-50 border border-brand-deep/5 rounded-xl">
              {showUnpaidOnly ? 'No unpaid orders remaining in this window!' : 'No orders registered for the morning window today.'}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {Object.entries(morningGrouped).map(([company, ordersList]) => (
                <div key={company} className="bg-white rounded-xl border border-brand-deep/5 shadow-xs overflow-hidden">
                  <div className="bg-bg-warm/30 px-5 py-3 border-b border-brand-deep/5 flex items-center gap-2">
                    <MapPin className="text-brand-accent" size={16} />
                    <span className="font-bold text-sm text-brand-deep">{company}</span>
                    <span className="text-xs bg-brand-deep/5 text-brand-deep px-2 py-0.5 rounded-full font-semibold">
                      {ordersList.length} delivery batch{ordersList.length > 1 ? 'es' : ''}
                    </span>
                  </div>

                  <div className="divide-y divide-brand-deep/5">
                    {ordersList.map((order) => (
                      <OrderRow
                        key={order.id}
                        order={order}
                        windowType="MORNING_11AM"
                        isUpdating={!!updatingIds[order.id]}
                        onAdvance={handleAdvanceStatus}
                        onCancel={handleCancelOrder}
                        onConfirmPayment={handleConfirmPayment}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 4:00 PM AFTERNOON WINDOW */}
        <section className="flex flex-col gap-4 mt-4">
          <div className="bg-brand-deep text-bg-warm p-4 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h2 className="font-extrabold text-md uppercase tracking-wider">☕ Afternoon Delivery Window</h2>
              <p className="text-xs opacity-75 mt-0.5">Targets 4:00 PM delivery batch</p>
            </div>
            <div className="bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 tabular-nums">
              {afternoonTotals.count} Orders · ₹{afternoonTotals.total} Total
            </div>
          </div>

          {afternoonFiltered.length === 0 ? (
            <div className="bg-white p-8 text-center text-sm opacity-50 border border-brand-deep/5 rounded-xl">
              {showUnpaidOnly ? 'No unpaid orders remaining in this window!' : 'No orders registered for the afternoon window today.'}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {Object.entries(afternoonGrouped).map(([company, ordersList]) => (
                <div key={company} className="bg-white rounded-xl border border-brand-deep/5 shadow-xs overflow-hidden">
                  <div className="bg-bg-warm/30 px-5 py-3 border-b border-brand-deep/5 flex items-center gap-2">
                    <MapPin className="text-brand-accent" size={16} />
                    <span className="font-bold text-sm text-brand-deep">{company}</span>
                    <span className="text-xs bg-brand-deep/5 text-brand-deep px-2 py-0.5 rounded-full font-semibold">
                      {ordersList.length} delivery batch{ordersList.length > 1 ? 'es' : ''}
                    </span>
                  </div>

                  <div className="divide-y divide-brand-deep/5">
                    {ordersList.map((order) => (
                      <OrderRow
                        key={order.id}
                        order={order}
                        windowType="AFTERNOON_4PM"
                        isUpdating={!!updatingIds[order.id]}
                        onAdvance={handleAdvanceStatus}
                        onCancel={handleCancelOrder}
                        onConfirmPayment={handleConfirmPayment}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

interface OrderRowProps {
  order: Order;
  windowType: 'MORNING_11AM' | 'AFTERNOON_4PM';
  isUpdating: boolean;
  onAdvance: (id: string, status: OrderStatus, windowType: 'MORNING_11AM' | 'AFTERNOON_4PM') => void;
  onCancel: (id: string, windowType: 'MORNING_11AM' | 'AFTERNOON_4PM') => void;
  onConfirmPayment: (id: string, windowType: 'MORNING_11AM' | 'AFTERNOON_4PM') => void;
}

function OrderRow({
  order,
  windowType,
  isUpdating,
  onAdvance,
  onCancel,
  onConfirmPayment,
}: OrderRowProps) {
  const nextActionLabel = NEXT_ACTION_LABELS[order.status];
  const isPaid = order.paymentStatus === PaymentStatus.PAID;
  const shouldReduceMotion = useReducedMotion();

  // Helper for status badge style
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PLACED:
        return 'bg-brand-deep/5 text-brand-deep border-brand-deep/15';
      case OrderStatus.PREPARING:
        return 'bg-brand-accent/10 text-brand-deep border-brand-accent/20 font-bold';
      case OrderStatus.OUT_FOR_DELIVERY:
        return 'bg-fresh/10 text-fresh border-fresh/25 font-bold';
      case OrderStatus.DELIVERED:
        return 'bg-fresh text-bg-warm border-fresh font-bold';
      case OrderStatus.CANCELLED:
        return 'bg-alert/15 text-alert border-alert/20 font-semibold';
      default:
        return 'bg-brand-deep/5 text-brand-deep';
    }
  };

  return (
    <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 text-sm hover:bg-bg-warm/5">
      {/* Order info */}
      <div className="flex-grow flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-brand-deep text-md">{order.customer.name}</span>
          <a
            href={`tel:${order.customer.phone}`}
            className="text-xs text-brand-accent hover:underline flex items-center gap-1 font-semibold"
          >
            <Phone size={10} />
            +91 {order.customer.phone}
          </a>
          <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full border ${getStatusColor(order.status)}`}>
            {STATUS_LABELS[order.status]}
          </span>
          
          {/* Payment Status Badge */}
          {isPaid ? (
            <span className="text-[10px] bg-fresh/10 text-fresh border border-fresh/25 font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
              Paid via {order.paymentMethod === PaymentMethod.UPI_QR ? 'UPI QR' : 'Cash'} ({order.paidBy || 'operator'})
            </span>
          ) : (
            <span className="text-[10px] bg-alert/10 text-alert border border-alert/25 font-bold px-2 py-0.5 rounded-full whitespace-nowrap uppercase">
              Unpaid ({order.paymentMethod === PaymentMethod.UPI_QR ? 'UPI QR' : 'Cash'})
            </span>
          )}

          {/* UPI Reference No Label */}
          {order.upiReferenceNo && (
            <span className="text-[10px] font-mono text-brand-deep/60 bg-bg-warm border border-brand-deep/10 px-2 py-0.5 rounded">
              UTR: {order.upiReferenceNo}
            </span>
          )}
        </div>

        {/* Ordered items list */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-deep/80">
          <ShoppingBag size={12} className="opacity-55" />
          {order.items.map((item) => (
            <span key={item.id} className="font-medium">
              {item.menuItem.name} <span className="opacity-60">x {item.quantity}</span>
            </span>
          ))}
        </div>

        {/* Custom request message */}
        {order.customRequest && (
          <p className="text-xs italic opacity-75 bg-bg-warm/25 p-2 rounded-md border border-brand-deep/5 max-w-lg mt-0.5">
            💡 "{order.customRequest}"
          </p>
        )}
      </div>

      {/* Pricing, Payment & Advance button */}
      <div className="shrink-0 flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-brand-deep/5 pt-3 md:pt-0">
        <div className="text-left md:text-right">
          <p className="text-sm font-extrabold text-brand-deep tabular-nums">₹{order.totalAmount}</p>
          <p className="text-[10px] opacity-60 font-semibold mt-0.5">
            {order.paymentMethod === PaymentMethod.UPI_QR ? 'UPI QR Link' : 'Cash on Delivery'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Reconcile payment manually action button */}
          {!isPaid && order.status !== OrderStatus.CANCELLED && (
            <motion.button
              whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
              onClick={() => onConfirmPayment(order.id, windowType)}
              disabled={isUpdating}
              className="px-3 py-2 bg-white hover:bg-fresh border border-fresh/35 text-fresh hover:text-bg-warm text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer disabled:opacity-50 animate-none"
              title="Confirm Payment"
            >
              <Landmark size={12} />
              {order.paymentMethod === PaymentMethod.UPI_QR ? 'Mark UPI Paid' : 'Mark Cash Paid'}
            </motion.button>
          )}

          {/* Cancel button if order is active */}
          {order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED && (
            <motion.button
              whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
              onClick={() => onCancel(order.id, windowType)}
              disabled={isUpdating}
              className="p-2 border border-brand-deep/10 hover:border-alert hover:bg-alert/5 text-brand-deep/40 hover:text-alert rounded-lg transition disabled:opacity-40 cursor-pointer animate-none"
              title="Cancel Order"
            >
              <Ban size={14} />
            </motion.button>
          )}

          {/* Action button */}
          {nextActionLabel && (
            <motion.button
              whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
              onClick={() => onAdvance(order.id, order.status, windowType)}
              disabled={isUpdating}
              className={`px-4 py-2 text-xs font-bold rounded-lg shadow-xs transition duration-150 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer animate-none ${
                order.status === OrderStatus.PLACED
                  ? 'bg-brand-deep hover:bg-brand-deep/90 text-bg-warm'
                  : order.status === OrderStatus.PREPARING
                  ? 'bg-brand-accent hover:bg-brand-accent/90 text-bg-warm'
                  : 'bg-fresh hover:bg-fresh/90 text-bg-warm'
              }`}
            >
              {order.status === OrderStatus.PLACED && <Flame size={12} />}
              {order.status === OrderStatus.PREPARING && <Truck size={12} />}
              {order.status === OrderStatus.OUT_FOR_DELIVERY && <Check size={12} />}
              {nextActionLabel}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
