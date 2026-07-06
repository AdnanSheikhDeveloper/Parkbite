'use client';

import { useState, useEffect } from 'react';
import { LogOut, MapPin, Check, RefreshCw, AlertCircle, ShoppingBag, Phone, Landmark, QrCode, ClipboardList, CheckSquare, Pencil, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logoutRider, riderConfirmPayment, riderMarkDelivered, riderUpdateOrderPrice } from './actions';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { motion, useReducedMotion } from 'framer-motion';

interface OrderItem {
  id: string;
  quantity: number;
  menuItem: {
    name: string;
  };
}

interface Order {
  id: string;
  deliveryWindow: 'MORNING_11AM' | 'AFTERNOON_4PM';
  status: OrderStatus;
  totalAmount: number;
  paymentMethod: 'CASH' | 'UPI_QR';
  paymentStatus: PaymentStatus;
  customRequest: string | null;
  createdAt: string;
  customer: {
    name: string;
    phone: string;
    company: string | null;
  };
  items: OrderItem[];
  qrCodeDataUrl: string;
}

interface RiderDashboardClientProps {
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

export default function RiderDashboardClient({
  initialMorningOrders,
  initialAfternoonOrders,
  dbError,
}: RiderDashboardClientProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [selectedWindow, setSelectedWindow] = useState<'MORNING_11AM' | 'AFTERNOON_4PM'>('MORNING_11AM');
  
  // Local state for orders
  const [morningOrders, setMorningOrders] = useState<Order[]>(initialMorningOrders);
  const [afternoonOrders, setAfternoonOrders] = useState<Order[]>(initialAfternoonOrders);
  
  // UI States
  const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({});
  const [errorMsg, setErrorMsg] = useState('');

  const activeOrders = selectedWindow === 'MORNING_11AM' ? morningOrders : afternoonOrders;
  const setActiveOrders = selectedWindow === 'MORNING_11AM' ? setMorningOrders : setAfternoonOrders;

  // Sync state with incoming props on hot reloads/refresh
  useEffect(() => {
    setMorningOrders(initialMorningOrders);
    setAfternoonOrders(initialAfternoonOrders);
  }, [initialMorningOrders, initialAfternoonOrders]);

  // Grouping helper
  const groupedOrders = activeOrders.reduce((acc, order) => {
    const key = order.customer.company || 'No Office Info';
    if (!acc[key]) acc[key] = [];
    acc[key].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  // Totals calculations
  const activeTotals = activeOrders.filter((o) => o.status !== OrderStatus.CANCELLED);
  const totalCount = activeTotals.length;
  const totalAmountSum = activeTotals.reduce((sum, o) => sum + o.totalAmount, 0);

  const handleLogout = async () => {
    await logoutRider();
    router.refresh();
  };

  const handleMarkDelivered = async (orderId: string) => {
    setErrorMsg('');
    setUpdatingIds((prev) => ({ ...prev, [orderId]: true }));
    try {
      const res = await riderMarkDelivered(orderId);
      if (res.success) {
        setActiveOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: OrderStatus.DELIVERED } : o))
        );
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to mark delivered');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Database connection error');
    } finally {
      setUpdatingIds((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleConfirmPayment = async (orderId: string, refNo: string) => {
    setErrorMsg('');
    setUpdatingIds((prev) => ({ ...prev, [orderId]: true }));
    try {
      const res = await riderConfirmPayment(orderId, refNo);
      if (res.success) {
        setActiveOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: PaymentStatus.PAID, paidBy: 'rider' } : o))
        );
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to update payment');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Database connection error');
    } finally {
      setUpdatingIds((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleUpdatePrice = async (orderId: string, newPrice: number): Promise<boolean> => {
    setErrorMsg('');
    setUpdatingIds((prev) => ({ ...prev, [orderId]: true }));
    try {
      const res = await riderUpdateOrderPrice(orderId, newPrice);
      if (res.success) {
        setActiveOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, totalAmount: newPrice } : o))
        );
        router.refresh();
        return true;
      } else {
        setErrorMsg(res.error || 'Failed to update order price');
        return false;
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to update price');
      return false;
    } finally {
      setUpdatingIds((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="flex flex-col min-h-screen bg-bg-warm font-sans pb-16">
      {/* Header wrapper */}
      <header className="bg-brand-deep text-bg-warm py-4 px-4 shadow-md sticky top-0 z-40">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold flex items-center gap-1.5">
            🛵 Rider Delivery Board
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 border border-bg-warm/15 hover:border-brand-accent rounded-lg text-bg-warm/90 hover:text-brand-accent cursor-pointer"
              title="Refresh Orders"
            >
              <RefreshCw size={14} />
            </button>
            <motion.button
              whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
              onClick={handleLogout}
              className="p-2 border border-bg-warm/15 hover:border-brand-accent rounded-lg text-xs font-semibold text-bg-warm/90 hover:text-brand-accent transition flex items-center gap-1 cursor-pointer"
            >
              <LogOut size={14} />
              Logout
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Column */}
      <div className="max-w-md mx-auto px-4 py-6 w-full flex-grow flex flex-col gap-6">
        
        {/* Toggle delivery window */}
        <div className="bg-white p-1 rounded-xl flex border border-brand-deep/5 shadow-xs">
          <motion.button
            whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
            onClick={() => setSelectedWindow('MORNING_11AM')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold text-center transition cursor-pointer ${
              selectedWindow === 'MORNING_11AM'
                ? 'bg-brand-deep text-bg-warm shadow-xs'
                : 'text-brand-deep/75 hover:bg-bg-warm/20'
            }`}
          >
            ☀️ Morning Window
          </motion.button>
          <motion.button
            whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
            onClick={() => setSelectedWindow('AFTERNOON_4PM')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold text-center transition cursor-pointer ${
              selectedWindow === 'AFTERNOON_4PM'
                ? 'bg-brand-deep text-bg-warm shadow-xs'
                : 'text-brand-deep/75 hover:bg-bg-warm/20'
            }`}
          >
            ☕ Afternoon Window
          </motion.button>
        </div>

        {/* Section Totals */}
        <div className="bg-white p-4 rounded-xl border border-brand-deep/5 shadow-xs flex justify-between items-center text-xs">
          <div className="flex items-center gap-1.5 font-bold text-brand-deep">
            <ClipboardList size={14} className="text-brand-accent" />
            <span>Active Deliveries: {totalCount}</span>
          </div>
          <div className="font-extrabold text-brand-accent tabular-nums">
            Value: ₹{totalAmountSum}
          </div>
        </div>

        {dbError && (
          <div className="bg-alert/15 border border-alert text-ink p-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="text-alert shrink-0 mt-0.5" size={18} />
            <span className="text-xs font-semibold">Offline: Failed to load current rider logs.</span>
          </div>
        )}

        {errorMsg && (
          <div className="bg-alert/15 border border-alert text-ink p-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="text-alert shrink-0 mt-0.5" size={18} />
            <span className="text-xs font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Grouped orders list */}
        {activeOrders.length === 0 ? (
          <div className="bg-white p-8 text-center text-sm opacity-50 border border-brand-deep/5 rounded-xl">
            No deliveries scheduled for this window today.
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {Object.entries(groupedOrders).map(([company, ordersList]) => (
              <div key={company} className="flex flex-col gap-3">
                {/* Floor/Company Header */}
                <h3 className="text-xs font-extrabold text-brand-deep uppercase tracking-wider flex items-center gap-1 opacity-70 px-1 mt-2">
                  <MapPin size={12} className="text-brand-accent" />
                  {company}
                </h3>

                {ordersList.map((order) => (
                  <RiderOrderCard
                    key={order.id}
                    order={order}
                    isUpdating={!!updatingIds[order.id]}
                    onConfirmPayment={handleConfirmPayment}
                    onMarkDelivered={handleMarkDelivered}
                    onUpdatePrice={handleUpdatePrice}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface RiderOrderCardProps {
  order: Order;
  isUpdating: boolean;
  onConfirmPayment: (id: string, refNo: string) => Promise<void>;
  onMarkDelivered: (id: string) => Promise<void>;
  onUpdatePrice: (id: string, newPrice: number) => Promise<boolean>;
}

function RiderOrderCard({
  order,
  isUpdating,
  onConfirmPayment,
  onMarkDelivered,
  onUpdatePrice,
}: RiderOrderCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const isPaid = order.paymentStatus === PaymentStatus.PAID;
  const isDelivered = order.status === OrderStatus.DELIVERED;

  const [showQr, setShowQr] = useState(false);
  const [showRefForm, setShowRefForm] = useState(false);
  const [refNo, setRefNo] = useState('');

  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editPriceInput, setEditPriceInput] = useState(String(order.totalAmount));

  useEffect(() => {
    setEditPriceInput(String(order.totalAmount));
  }, [order.totalAmount]);

  const handleSavePrice = async () => {
    const val = parseFloat(editPriceInput);
    if (isNaN(val) || val < 0) {
      alert('Please enter a valid price');
      return;
    }
    const success = await onUpdatePrice(order.id, val);
    if (success) {
      setIsEditingPrice(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-xl border p-5 shadow-xs flex flex-col gap-4 transition-all duration-200 ${
        isDelivered ? 'opacity-60 border-brand-deep/5 bg-white/60' : 'border-brand-deep/10'
      }`}
    >
      {/* Customer info */}
      <div className="flex justify-between items-start gap-2">
        <div>
          <h4 className="font-extrabold text-brand-deep text-md">{order.customer.name}</h4>
          <a
            href={`tel:${order.customer.phone}`}
            className="text-xs text-brand-accent hover:underline flex items-center gap-1 font-semibold mt-0.5"
          >
            <Phone size={10} />
            +91 {order.customer.phone}
          </a>
          <p className="text-[10px] font-mono text-brand-deep/50 mt-1">
            ID: {order.id}
          </p>
        </div>
        <div className="text-right">
          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
            isDelivered ? 'bg-fresh/5 text-fresh border-fresh/10' : 'bg-brand-accent/5 text-brand-accent border-brand-accent/10'
          }`}>
            {STATUS_LABELS[order.status]}
          </span>
        </div>
      </div>

      {/* Items */}
      {order.items.length > 0 && (
        <div className="bg-bg-warm/30 p-3 rounded-lg border border-brand-deep/5 flex flex-col gap-1.5 text-xs text-brand-deep">
          <span className="text-[10px] uppercase font-bold opacity-50 block mb-0.5">Order Items</span>
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between font-medium">
              <span>{item.menuItem.name}</span>
              <span className="opacity-70 font-semibold">x{item.quantity}</span>
            </div>
          ))}
        </div>
      )}

      {/* Custom request notes */}
      {order.customRequest && (
        <div className="text-xs bg-bg-warm/15 p-2.5 rounded-md border border-brand-deep/5 font-semibold text-brand-deep italic">
          💡 "{order.customRequest}"
        </div>
      )}

      {/* Bottom Summary Bar */}
      <div className="flex justify-between items-center border-t border-brand-deep/5 pt-3">
        <div className="flex items-center gap-2">
          {isEditingPrice ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={editPriceInput}
                onChange={(e) => setEditPriceInput(e.target.value)}
                className="w-16 p-1 text-xs border border-brand-deep/20 rounded focus:outline-hidden text-brand-deep font-semibold"
                min="0"
                step="0.01"
              />
              <button
                onClick={handleSavePrice}
                className="p-1 bg-fresh text-bg-warm rounded hover:opacity-90 cursor-pointer flex items-center justify-center w-5 h-5 text-[10px] font-bold"
                title="Save Price"
              >
                ✓
              </button>
              <button
                onClick={() => {
                  setIsEditingPrice(false);
                  setEditPriceInput(String(order.totalAmount));
                }}
                className="p-1 bg-alert/15 text-alert rounded hover:opacity-90 cursor-pointer flex items-center justify-center w-5 h-5 text-[10px] font-bold"
                title="Cancel"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 group">
              <div>
                <p className="text-md font-extrabold text-brand-deep tabular-nums">
                  {order.totalAmount > 0 ? `₹${order.totalAmount}` : '₹TBD'}
                </p>
                <p className="text-[10px] opacity-60 font-semibold mt-0.5">
                  {order.paymentMethod === 'UPI_QR' ? 'UPI QR Link' : 'Cash on Delivery'}
                </p>
              </div>
              <button
                onClick={() => setIsEditingPrice(true)}
                className="text-brand-deep/30 hover:text-brand-accent cursor-pointer transition p-1 rounded"
                title="Edit Price"
              >
                <Pencil size={12} />
              </button>
            </div>
          )}
        </div>

        <div className="text-right">
          {isPaid ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-fresh text-bg-warm rounded-lg text-xs font-bold shadow-xs">
              <Check size={12} />
              Paid ✓
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 bg-alert/10 text-alert border border-alert/25 rounded-lg text-xs font-bold uppercase">
              Unpaid
            </span>
          )}
        </div>
      </div>

      {/* Action targets - Large targets for one-handed use */}
      <div className="flex flex-col gap-2 border-t border-brand-deep/5 pt-3 mt-1">
        
        {/* 1. Show QR Code button for UPI_QR pending orders (only if totalAmount > 0) */}
        {!isPaid && order.paymentMethod === 'UPI_QR' && order.totalAmount > 0 && (
          <motion.button
            type="button"
            whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
            onClick={() => setShowQr(!showQr)}
            className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              showQr 
                ? 'bg-brand-deep text-bg-warm border border-brand-deep' 
                : 'bg-white border-2 border-brand-accent text-brand-accent hover:bg-brand-accent/5'
            }`}
          >
            <QrCode size={16} />
            {showQr ? 'Hide UPI QR' : 'Show UPI QR to Customer'}
          </motion.button>
        )}

        {/* Inline QR representation */}
        {showQr && !isPaid && order.totalAmount > 0 && (
          <div className="bg-bg-warm p-4 rounded-xl border border-brand-deep/10 flex flex-col items-center justify-center gap-2 animate-fadeIn">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={order.qrCodeDataUrl} 
              alt="UPI QR Code" 
              className="w-36 h-36"
            />
            <span className="text-[10px] text-brand-deep font-semibold opacity-85">
              Scan to pay ₹{order.totalAmount}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {/* 2. Mark Paid action target */}
          {!isPaid ? (
            showRefForm ? (
              <div className="col-span-2 flex flex-col gap-2 bg-bg-warm/40 p-3 rounded-lg border border-brand-deep/5 text-left">
                <label htmlFor={`utr-${order.id}`} className="block text-[10px] font-bold text-brand-deep uppercase mb-1">
                  UPI Reference # (UTR) - Optional
                </label>
                <input
                  id={`utr-${order.id}`}
                  type="text"
                  placeholder="e.g. 319208..."
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                  className="w-full p-2 bg-white border border-brand-deep/15 rounded-md text-xs font-semibold text-brand-deep"
                />
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <motion.button
                    whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
                    onClick={() => onConfirmPayment(order.id, refNo)}
                    disabled={isUpdating}
                    className="py-2.5 bg-fresh hover:bg-fresh/90 text-bg-warm text-xs font-bold rounded-lg transition cursor-pointer animate-none"
                  >
                    Confirm Paid
                  </motion.button>
                  <motion.button
                    whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
                    onClick={() => setShowRefForm(false)}
                    className="py-2.5 bg-brand-deep/10 hover:bg-brand-deep/20 text-brand-deep text-xs font-semibold rounded-lg transition cursor-pointer animate-none"
                  >
                    Cancel
                  </motion.button>
                </div>
              </div>
            ) : (
              <motion.button
                whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
                onClick={() => {
                  if (order.paymentMethod === 'UPI_QR') {
                    setShowRefForm(true);
                  } else {
                    // Cash received confirms instantly
                    onConfirmPayment(order.id, '');
                  }
                }}
                disabled={isUpdating}
                className="py-3 px-4 bg-fresh hover:bg-fresh/90 text-bg-warm text-xs font-extrabold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer animate-none"
              >
                <Landmark size={14} />
                {order.paymentMethod === 'UPI_QR' ? 'Mark UPI Paid' : 'Cash Received'}
              </motion.button>
            )
          ) : (
            <div className="py-3 px-4 bg-bg-warm/35 border border-brand-deep/5 text-brand-deep/50 text-xs font-semibold rounded-xl text-center flex items-center justify-center gap-1">
              <CheckSquare size={14} />
              Paid
            </div>
          )}

          {/* 3. Mark Delivered action target */}
          {!isDelivered ? (
            <motion.button
              whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
              onClick={() => onMarkDelivered(order.id)}
              disabled={isUpdating}
              className="py-3 px-4 bg-brand-deep hover:bg-brand-deep/90 text-bg-warm text-xs font-extrabold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer animate-none"
            >
              <Check size={14} />
              Mark Delivered
            </motion.button>
          ) : (
            <div className="py-3 px-4 bg-bg-warm/35 border border-brand-deep/5 text-brand-deep/50 text-xs font-semibold rounded-xl text-center flex items-center justify-center gap-1">
              <CheckSquare size={14} />
              Delivered
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
