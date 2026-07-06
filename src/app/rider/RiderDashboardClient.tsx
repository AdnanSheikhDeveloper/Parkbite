'use client';

import { useState, useEffect } from 'react';
import { LogOut, MapPin, Check, RefreshCw, AlertCircle, ShoppingBag, Phone, Landmark, QrCode, ClipboardList, CheckSquare, Pencil, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logoutRider, riderConfirmPayment, riderMarkDelivered, riderUpdateOrderPrice, riderUpdateOrderStatus } from './actions';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  
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

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus): Promise<boolean> => {
    setErrorMsg('');
    setUpdatingIds((prev) => ({ ...prev, [orderId]: true }));
    try {
      const res = await riderUpdateOrderStatus(orderId, newStatus);
      if (res.success) {
        setActiveOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
        router.refresh();
        return true;
      } else {
        setErrorMsg(res.error || 'Failed to update order status');
        return false;
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to update status');
      return false;
    } finally {
      setUpdatingIds((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#fcfbfa] font-sans pb-16">
      {/* Premium Dark Gradient Header */}
      <header className="bg-gradient-to-r from-brand-deep to-[#0f1a30] text-bg-warm py-4 px-4 shadow-md sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-md font-extrabold tracking-tight flex items-center gap-2">
            <span className="text-brand-accent animate-bounce">🛵</span> Rider Delivery Board
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className={`p-2 border border-white/10 hover:border-brand-accent rounded-xl text-bg-warm/95 hover:text-brand-accent transition cursor-pointer flex items-center justify-center ${
                isRefreshing ? 'animate-spin' : ''
              }`}
              title="Sync Orders"
            >
              <RefreshCw size={14} />
            </button>
            <motion.button
              whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
              onClick={handleLogout}
              className="px-3 py-1.5 border border-white/10 hover:border-alert rounded-xl text-xs font-bold text-bg-warm/90 hover:text-alert transition flex items-center gap-1 cursor-pointer"
            >
              <LogOut size={12} />
              Logout
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Column */}
      <div className="max-w-md mx-auto px-4 py-6 w-full flex-grow flex flex-col gap-5">
        
        {/* Toggle delivery window */}
        <div className="bg-brand-deep/5 p-1 rounded-2xl flex border border-brand-deep/10 shadow-inner">
          <motion.button
            whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
            onClick={() => setSelectedWindow('MORNING_11AM')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold text-center transition duration-200 cursor-pointer ${
              selectedWindow === 'MORNING_11AM'
                ? 'bg-brand-deep text-bg-warm shadow-sm'
                : 'text-brand-deep/70 hover:text-brand-deep hover:bg-brand-deep/5'
            }`}
          >
            ☀️ Morning Window
          </motion.button>
          <motion.button
            whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
            onClick={() => setSelectedWindow('AFTERNOON_4PM')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold text-center transition duration-200 cursor-pointer ${
              selectedWindow === 'AFTERNOON_4PM'
                ? 'bg-brand-deep text-bg-warm shadow-sm'
                : 'text-brand-deep/70 hover:text-brand-deep hover:bg-brand-deep/5'
            }`}
          >
            ☕ Afternoon Window
          </motion.button>
        </div>

        {/* Section Totals Summary Banner */}
        <div className="bg-white p-4 rounded-2xl border border-brand-deep/5 shadow-xs flex justify-between items-center text-xs">
          <div className="flex items-center gap-2 font-extrabold text-brand-deep">
            <ClipboardList size={16} className="text-brand-accent" />
            <span>Active Deliveries: {totalCount}</span>
          </div>
          <div className="font-black text-brand-accent text-sm tabular-nums">
            Value: ₹{totalAmountSum}
          </div>
        </div>

        {dbError && (
          <div className="bg-alert/10 border border-alert/20 text-alert p-3.5 rounded-xl flex items-start gap-2.5">
            <AlertCircle className="text-alert shrink-0 mt-0.5" size={18} />
            <span className="text-xs font-semibold">Offline: Failed to load current rider logs.</span>
          </div>
        )}

        {errorMsg && (
          <div className="bg-alert/10 border border-alert/20 text-alert p-3.5 rounded-xl flex items-start gap-2.5">
            <AlertCircle className="text-alert shrink-0 mt-0.5" size={18} />
            <span className="text-xs font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Grouped orders list */}
        {activeOrders.length === 0 ? (
          <div className="bg-white p-12 text-center text-sm opacity-55 border border-brand-deep/5 rounded-2xl shadow-xs italic">
            No deliveries scheduled for this window today.
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <AnimatePresence mode="popLayout" initial={false}>
              {Object.entries(groupedOrders).map(([company, ordersList]) => (
                <motion.div 
                  key={company} 
                  layout={!shouldReduceMotion}
                  initial={shouldReduceMotion ? {} : { opacity: 0, y: 15 }}
                  animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
                  exit={shouldReduceMotion ? {} : { opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-3"
                >
                  {/* Floor/Company Header Banner */}
                  <h3 className="text-xs font-black text-brand-deep uppercase tracking-wider flex items-center gap-1.5 opacity-80 px-1.5 mt-2">
                    <MapPin size={14} className="text-brand-accent" />
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
                      onUpdateStatus={handleUpdateStatus}
                    />
                  ))}
                </motion.div>
              ))}
            </AnimatePresence>
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
  onUpdateStatus: (id: string, newStatus: OrderStatus) => Promise<boolean>;
}

function RiderOrderCard({
  order,
  isUpdating,
  onConfirmPayment,
  onMarkDelivered,
  onUpdatePrice,
  onUpdateStatus,
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
      className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col gap-4 transition-all duration-200 ${
        isDelivered ? 'opacity-65 border-brand-deep/5 bg-[#faf9f8]' : 'border-brand-deep/10 hover:shadow-sm'
      }`}
    >
      {/* Customer details row */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex flex-col gap-1">
          <h4 className="font-black text-brand-deep text-md tracking-tight">{order.customer.name}</h4>
          
          {/* Phone call pill */}
          <a
            href={`tel:${order.customer.phone}`}
            className="text-xs bg-brand-accent/10 hover:bg-brand-accent/15 text-brand-accent px-2.5 py-1 rounded-lg flex items-center gap-1 font-extrabold w-fit transition"
          >
            <Phone size={12} />
            +91 {order.customer.phone}
          </a>
          
          <p className="text-[9px] font-mono text-brand-deep/45 mt-0.5 select-all">
            ORDER ID: {order.id.substring(0, 8)}...
          </p>
        </div>
        
        <div className="text-right flex items-center gap-1.5">
          <select
            value={order.status}
            onChange={(e) => onUpdateStatus(order.id, e.target.value as OrderStatus)}
            disabled={isUpdating}
            className={`text-[9px] uppercase font-black tracking-wider px-2 py-1 rounded-lg border focus:outline-hidden cursor-pointer ${
              order.status === OrderStatus.DELIVERED
                ? 'bg-fresh/10 text-fresh border-fresh/25'
                : order.status === OrderStatus.CANCELLED
                ? 'bg-alert/10 text-alert border-alert/25'
                : 'bg-brand-accent/10 text-brand-deep border-brand-accent/25'
            }`}
          >
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key} className="text-brand-deep bg-white text-xs font-semibold uppercase">
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Monospace Receipt-style Order Items */}
      {order.items.length > 0 && (
        <div className="bg-[#FAF9F7] p-3.5 rounded-xl border border-dashed border-brand-deep/10 flex flex-col gap-2 font-mono text-xs text-brand-deep/90 shadow-inner">
          <span className="text-[10px] font-bold text-brand-deep/40 block border-b border-brand-deep/5 pb-1">DELIVERY BATCH LIST</span>
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between font-medium">
              <span>{item.menuItem.name}</span>
              <span className="font-extrabold">x{item.quantity}</span>
            </div>
          ))}
        </div>
      )}

      {/* Custom request instructions box */}
      {order.customRequest && (
        <div className="text-xs bg-brand-accent/5 border-l-3 border-brand-accent px-3 py-2.5 rounded-r-xl font-semibold text-brand-deep/90 flex items-start gap-1">
          <span className="shrink-0 mt-0.5">💡</span>
          <span className="italic">"{order.customRequest}"</span>
        </div>
      )}

      {/* Bottom pricing section */}
      <div className="flex justify-between items-center border-t border-brand-deep/5 pt-3">
        <div className="flex items-center gap-2">
          {isEditingPrice ? (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={editPriceInput}
                onChange={(e) => setEditPriceInput(e.target.value)}
                className="w-16 p-1 text-xs border border-brand-deep/20 rounded focus:outline-hidden text-brand-deep font-bold"
                min="0"
                step="0.01"
              />
              <button
                onClick={handleSavePrice}
                className="p-1 bg-fresh text-bg-warm rounded hover:opacity-90 cursor-pointer flex items-center justify-center w-5 h-5 text-[10px] font-black"
                title="Save Price"
              >
                ✓
              </button>
              <button
                onClick={() => {
                  setIsEditingPrice(false);
                  setEditPriceInput(String(order.totalAmount));
                }}
                className="p-1 bg-alert/15 text-alert rounded hover:opacity-90 cursor-pointer flex items-center justify-center w-5 h-5 text-[10px] font-black"
                title="Cancel"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 group">
              <div>
                <p className="text-md font-extrabold text-brand-deep tabular-nums">
                  {order.totalAmount > 0 ? `₹${order.totalAmount}` : '₹TBD'}
                </p>
                <p className="text-[10px] opacity-60 font-semibold mt-0.5">
                  {order.paymentMethod === 'UPI_QR' ? 'UPI QR' : 'Cash'} Payment
                </p>
              </div>
              {!isPaid && !isDelivered && (
                <button
                  onClick={() => setIsEditingPrice(true)}
                  className="text-brand-deep/30 hover:text-brand-accent cursor-pointer transition p-1 rounded-lg hover:bg-brand-deep/5"
                  title="Modify Price"
                >
                  <Pencil size={12} />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="text-right">
          {isPaid ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-fresh text-bg-warm rounded-lg text-xs font-black shadow-sm">
              <Check size={12} />
              Paid ✓
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 bg-alert/10 text-alert border border-alert/20 rounded-lg text-xs font-bold uppercase tracking-wider">
              Unpaid
            </span>
          )}
        </div>
      </div>

      {/* Large touches action panels */}
      <div className="flex flex-col gap-2 border-t border-brand-deep/5 pt-3 mt-1">
        
        {/* 1. UPI QR Expansion triggers */}
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

        {/* Display qrCode representation */}
        {showQr && !isPaid && order.totalAmount > 0 && (
          <div className="bg-[#FAF9F7] p-4 rounded-xl border border-brand-deep/10 flex flex-col items-center justify-center gap-2 shadow-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={order.qrCodeDataUrl} 
              alt="UPI QR Code" 
              className="w-36 h-36"
            />
            <span className="text-[10px] text-brand-deep font-bold opacity-80">
              Scan to pay ₹{order.totalAmount}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {/* 2. Reconcile Payments */}
          {!isPaid ? (
            showRefForm ? (
              <div className="col-span-2 flex flex-col gap-2 bg-[#FAF9F7] p-3 rounded-xl border border-brand-deep/5 text-left">
                <label htmlFor={`utr-${order.id}`} className="block text-[10px] font-bold text-brand-deep uppercase mb-1">
                  UPI Reference # (UTR) - Optional
                </label>
                <input
                  id={`utr-${order.id}`}
                  type="text"
                  placeholder="e.g. 319208..."
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                  className="w-full p-2.5 bg-white border border-brand-deep/15 rounded-lg text-xs font-semibold text-brand-deep"
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
                    className="py-2.5 bg-brand-deep/10 hover:bg-brand-deep/20 text-brand-deep text-xs font-semibold rounded-lg transition cursor-pointer"
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
                    // Cash payment reconciles instantly
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
            <div className="py-3 px-4 bg-bg-warm/35 border border-brand-deep/5 text-brand-deep/40 text-xs font-semibold rounded-xl text-center flex items-center justify-center gap-1 shadow-inner">
              <CheckSquare size={14} />
              Paid
            </div>
          )}

          {/* 3. Reconcile Delivery */}
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
            <div className="py-3 px-4 bg-bg-warm/35 border border-brand-deep/5 text-brand-deep/40 text-xs font-semibold rounded-xl text-center flex items-center justify-center gap-1 shadow-inner">
              <CheckSquare size={14} />
              Delivered
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
