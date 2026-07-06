'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  RefreshCw, 
  MapPin, 
  Check, 
  Truck, 
  Flame, 
  AlertCircle, 
  ShoppingBag, 
  Phone, 
  Ban, 
  Landmark, 
  CheckSquare, 
  Filter, 
  Search, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Pencil
} from 'lucide-react';
import AdminHeader from '@/components/AdminHeader';
import { advanceOrderStatus, cancelOrder, adminConfirmPayment, adminUpdateOrderPrice } from './actions';
import { OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

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

interface Filters {
  window: string;
  status: string;
  paymentStatus: string;
  search: string;
}

interface OrdersDashboardClientProps {
  orders: Order[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  morningCount: number;
  morningTotal: number;
  afternoonCount: number;
  afternoonTotal: number;
  filters: Filters;
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
  orders,
  currentPage,
  totalPages,
  totalCount,
  morningCount,
  morningTotal,
  afternoonCount,
  afternoonTotal,
  filters,
  dbError,
}: OrdersDashboardClientProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  // Local state reflecting queries
  const [ordersList, setOrdersList] = useState<Order[]>(orders);
  const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({});
  const [errorMsg, setErrorMsg] = useState('');

  // Local form inputs mirroring filters
  const [searchInput, setSearchInput] = useState(filters.search);
  const [statusInput, setStatusInput] = useState(filters.status);
  const [paymentInput, setPaymentInput] = useState(filters.paymentStatus);

  // Sync state with incoming props on re-render
  useEffect(() => {
    setOrdersList(orders);
  }, [orders]);

  useEffect(() => {
    setSearchInput(filters.search);
    setStatusInput(filters.status);
    setPaymentInput(filters.paymentStatus);
  }, [filters]);

  const updateFilters = (updated: Partial<Filters> & { page?: number }) => {
    const params = new URLSearchParams();

    const merged = {
      window: updated.window !== undefined ? updated.window : filters.window,
      status: updated.status !== undefined ? updated.status : statusInput,
      paymentStatus: updated.paymentStatus !== undefined ? updated.paymentStatus : paymentInput,
      search: updated.search !== undefined ? updated.search : searchInput,
      page: updated.page !== undefined ? updated.page : 1,
    };

    if (merged.window !== 'ALL') params.set('window', merged.window);
    if (merged.status !== 'ALL') params.set('status', merged.status);
    if (merged.paymentStatus !== 'ALL') params.set('paymentStatus', merged.paymentStatus);
    if (merged.search) params.set('search', merged.search);
    if (merged.page > 1) params.set('page', String(merged.page));

    router.push(`/admin/orders?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput, page: 1 });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setStatusInput('ALL');
    setPaymentInput('ALL');
    router.push('/admin/orders');
  };

  // Status transition handler with local state feedback
  const handleAdvanceStatus = async (orderId: string, currentStatus: OrderStatus) => {
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

        setOrdersList((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
        );
        router.refresh();
      } else {
        setErrorMsg(result.error || 'Failed to update order status');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to update status');
    } finally {
      setUpdatingIds((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  // Cancel order handler with confirmation
  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    setErrorMsg('');
    setUpdatingIds((prev) => ({ ...prev, [orderId]: true }));
    try {
      const result = await cancelOrder(orderId);
      if (result.success) {
        setOrdersList((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: OrderStatus.CANCELLED } : o))
        );
        router.refresh();
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

  // Confirm payment manually handler
  const handleConfirmPayment = async (orderId: string) => {
    setErrorMsg('');
    setUpdatingIds((prev) => ({ ...prev, [orderId]: true }));
    try {
      const result = await adminConfirmPayment(orderId);
      if (result.success) {
        setOrdersList((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: PaymentStatus.PAID, paidBy: 'admin' } : o))
        );
        router.refresh();
      } else {
        setErrorMsg(result.error || 'Failed to confirm payment');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to reconcile payment');
    } finally {
      setUpdatingIds((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleUpdatePrice = async (orderId: string, newPrice: number): Promise<boolean> => {
    setErrorMsg('');
    setUpdatingIds((prev) => ({ ...prev, [orderId]: true }));
    try {
      const result = await adminUpdateOrderPrice(orderId, newPrice);
      if (result.success) {
        setOrdersList((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, totalAmount: newPrice } : o))
        );
        router.refresh();
        return true;
      } else {
        setErrorMsg(result.error || 'Failed to update order price');
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

  // Group current page orders by company
  const groupedOrders = ordersList.reduce((acc, order) => {
    const key = order.customer.company || 'No Company/Floor Info';
    if (!acc[key]) acc[key] = [];
    acc[key].push(order);
    return acc;
  }, {} as Record<string, Order[]>);

  const isFiltering = filters.window !== 'ALL' || filters.status !== 'ALL' || filters.paymentStatus !== 'ALL' || filters.search !== '';

  return (
    <div className="min-h-screen bg-bg-warm flex flex-col">
      <AdminHeader />

      <main className="max-w-6xl mx-auto px-4 py-8 flex-grow w-full flex flex-col gap-6">
        
        {/* Title row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-brand-deep/10 pb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-brand-deep">Orders Administration</h1>
            <p className="text-xs opacity-60 mt-1">Real-time catering logs and office batch packaging dispatch</p>
          </div>

          {/* Window Segment Toggle Buttons (ALL, Morning, Afternoon) */}
          <div className="bg-brand-deep/5 p-1 rounded-xl flex border border-brand-deep/10 shadow-inner w-full md:w-auto relative min-h-[44px] items-center">
            {[
              { id: 'ALL', label: 'Whole View' },
              { id: 'MORNING_11AM', label: '☀️ Morning 11 AM' },
              { id: 'AFTERNOON_4PM', label: '☕ Afternoon 4 PM' }
            ].map((win) => {
              const isSelected = filters.window === win.id;
              return (
                <button
                  key={win.id}
                  onClick={() => updateFilters({ window: win.id, page: 1 })}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-extrabold text-center transition-all duration-200 cursor-pointer ${
                    isSelected 
                      ? 'bg-brand-deep text-bg-warm shadow-sm' 
                      : 'text-brand-deep/60 hover:text-brand-deep/80'
                  }`}
                >
                  {win.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="bg-alert/15 border border-alert text-ink p-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="text-alert shrink-0 mt-0.5" size={18} />
            <span className="text-xs font-semibold">{errorMsg}</span>
          </div>
        )}

        {dbError && (
          <div className="bg-alert/15 border border-alert text-ink p-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="text-alert shrink-0 mt-0.5" size={18} />
            <span className="text-xs font-semibold">Offline Mode: Database connection not configured.</span>
          </div>
        )}

        {/* TODAY ACTIVE WINDOW SUMMARY BAR (Always Today's Totals) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-xl border border-brand-deep/5 shadow-xs flex justify-between items-center relative hover:shadow transition duration-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-brand-deep/50 block mb-1">Morning Target</span>
              <h3 className="text-md font-bold text-brand-deep">🌅 Today's 11:00 AM Batch</h3>
            </div>
            <div className="bg-brand-deep text-bg-warm px-3.5 py-2 rounded-lg text-xs font-extrabold shadow-sm tabular-nums">
              {morningCount} Orders · ₹{morningTotal} Value
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-brand-deep/5 shadow-xs flex justify-between items-center relative hover:shadow transition duration-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-brand-deep/50 block mb-1">Afternoon Target</span>
              <h3 className="text-md font-bold text-brand-deep">☕ Today's 4:00 PM Batch</h3>
            </div>
            <div className="bg-brand-deep text-bg-warm px-3.5 py-2 rounded-lg text-xs font-extrabold shadow-sm tabular-nums">
              {afternoonCount} Orders · ₹{afternoonTotal} Value
            </div>
          </div>
        </div>

        {/* SEARCH AND FILTERS TOOLBAR */}
        <div className="bg-white p-4 rounded-xl border border-brand-deep/5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Left Side: Search Bar form */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-grow max-w-md w-full">
            <div className="relative flex-grow">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-deep/40">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Search name, phone, or company..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs border border-brand-deep/15 rounded-lg focus:border-brand-accent focus:ring-1 focus:ring-brand-accent focus:outline-hidden text-brand-deep font-semibold"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    updateFilters({ search: '', page: 1 });
                  }}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-brand-deep/40 hover:text-brand-deep"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-deep text-bg-warm font-bold text-xs rounded-lg transition hover:opacity-90 cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Right Side: Select Dropdowns & Clears */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <label htmlFor="filter-status" className="text-[10px] uppercase font-bold text-brand-deep/50">Status:</label>
              <select
                id="filter-status"
                value={statusInput}
                onChange={(e) => {
                  setStatusInput(e.target.value);
                  updateFilters({ status: e.target.value, page: 1 });
                }}
                className="p-2 border border-brand-deep/15 rounded-lg text-xs font-semibold text-brand-deep bg-white focus:outline-hidden"
              >
                <option value="ALL">All Statuses</option>
                {Object.entries(STATUS_LABELS).map(([key, val]) => (
                  <option key={key} value={key}>{val}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <label htmlFor="filter-payment" className="text-[10px] uppercase font-bold text-brand-deep/50">Payment:</label>
              <select
                id="filter-payment"
                value={paymentInput}
                onChange={(e) => {
                  setPaymentInput(e.target.value);
                  updateFilters({ paymentStatus: e.target.value, page: 1 });
                }}
                className="p-2 border border-brand-deep/15 rounded-lg text-xs font-semibold text-brand-deep bg-white focus:outline-hidden"
              >
                <option value="ALL">All Payments</option>
                <option value="PENDING">Unpaid</option>
                <option value="PAID">Paid</option>
              </select>
            </div>

            {isFiltering && (
              <button
                onClick={handleClearFilters}
                className="px-3 py-2 border border-alert/20 text-alert hover:bg-alert/5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
              >
                <X size={12} />
                Clear
              </button>
            )}
          </div>

        </div>

        {/* ORDERS CONTAINER */}
        {ordersList.length === 0 ? (
          <div className="bg-white p-12 text-center text-sm opacity-50 border border-brand-deep/5 rounded-xl shadow-xs italic">
            No matching orders found in the database.
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
                  className="bg-white rounded-xl border border-brand-deep/5 shadow-xs overflow-hidden"
                >
                  <div className="bg-bg-warm/30 px-5 py-3 border-b border-brand-deep/5 flex items-center gap-2">
                    <MapPin className="text-brand-accent" size={16} />
                    <span className="font-bold text-sm text-brand-deep">{company}</span>
                    <span className="text-xs bg-brand-deep/5 text-brand-deep px-2 py-0.5 rounded-full font-semibold">
                      {ordersList.length} match{ordersList.length > 1 ? 'es' : ''}
                    </span>
                  </div>

                  <div className="divide-y divide-brand-deep/5">
                    {ordersList.map((order) => (
                      <OrderRow
                        key={order.id}
                        order={order}
                        windowType={order.deliveryWindow}
                        isUpdating={!!updatingIds[order.id]}
                        onAdvance={handleAdvanceStatus}
                        onCancel={handleCancelOrder}
                        onConfirmPayment={handleConfirmPayment}
                        onUpdatePrice={handleUpdatePrice}
                      />
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* PAGINATION FOOTER */}
        {totalPages > 1 && (
          <div className="bg-white p-4 rounded-xl border border-brand-deep/5 shadow-xs flex items-center justify-between mt-4">
            <div className="text-xs text-brand-deep/60 font-semibold">
              Showing page <span className="font-bold text-brand-deep">{currentPage}</span> of <span className="font-bold text-brand-deep">{totalPages}</span> ({totalCount} total matching logs)
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateFilters({ page: currentPage - 1 })}
                disabled={currentPage <= 1}
                className="p-2 border border-brand-deep/15 hover:border-brand-accent rounded-lg text-brand-deep hover:text-brand-accent transition disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              
              <button
                onClick={() => updateFilters({ page: currentPage + 1 })}
                disabled={currentPage >= totalPages}
                className="p-2 border border-brand-deep/15 hover:border-brand-accent rounded-lg text-brand-deep hover:text-brand-accent transition disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

interface OrderRowProps {
  order: Order;
  windowType: 'MORNING_11AM' | 'AFTERNOON_4PM';
  isUpdating: boolean;
  onAdvance: (id: string, status: OrderStatus) => void;
  onCancel: (id: string) => void;
  onConfirmPayment: (id: string) => void;
  onUpdatePrice: (id: string, newPrice: number) => Promise<boolean>;
}

function OrderRow({
  order,
  windowType,
  isUpdating,
  onAdvance,
  onCancel,
  onConfirmPayment,
  onUpdatePrice,
}: OrderRowProps) {
  const nextActionLabel = NEXT_ACTION_LABELS[order.status];
  const isPaid = order.paymentStatus === PaymentStatus.PAID;
  const shouldReduceMotion = useReducedMotion();

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
          <span className="text-[10px] bg-brand-deep/5 border border-brand-deep/15 text-brand-deep px-2 py-0.5 rounded-full font-bold">
            {windowType === 'MORNING_11AM' ? '🌅 Morning' : '☕ Afternoon'}
          </span>
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
              {item.menuItem.name} <span className="opacity-60 text-[10px] ml-0.5">x{item.quantity}</span>
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
        <div className="text-left md:text-right flex flex-col items-start md:items-end min-w-[120px]">
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
                className="p-1 bg-fresh text-bg-warm rounded hover:opacity-90 cursor-pointer flex items-center justify-center w-5 h-5"
                title="Save Price"
              >
                <Check size={10} />
              </button>
              <button
                onClick={() => {
                  setIsEditingPrice(false);
                  setEditPriceInput(String(order.totalAmount));
                }}
                className="p-1 bg-alert/15 text-alert rounded hover:opacity-90 cursor-pointer flex items-center justify-center w-5 h-5"
                title="Cancel"
              >
                <X size={10} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 group">
              <p className="text-sm font-extrabold text-brand-deep tabular-nums">₹{order.totalAmount}</p>
              <button
                onClick={() => setIsEditingPrice(true)}
                className="text-brand-deep/30 hover:text-brand-accent cursor-pointer transition p-0.5 rounded"
                title="Edit Price"
              >
                <Pencil size={10} />
              </button>
            </div>
          )}
          <p className="text-[10px] opacity-60 font-semibold mt-0.5">
            {order.paymentMethod === PaymentMethod.UPI_QR ? 'UPI QR Link' : 'Cash on Delivery'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Reconcile payment manually action button */}
          {!isPaid && order.status !== OrderStatus.CANCELLED && (
            <motion.button
              whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
              onClick={() => onConfirmPayment(order.id)}
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
              onClick={() => onCancel(order.id)}
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
              onClick={() => onAdvance(order.id, order.status)}
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
