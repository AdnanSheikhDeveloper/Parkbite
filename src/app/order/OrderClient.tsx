'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Plus, Minus, Info, AlertTriangle } from 'lucide-react';
import { DeliveryWindowOption } from '@/lib/date-utils';
import { motion, AnimatePresence, useReducedMotion, useMotionValue, useTransform, animate } from 'framer-motion';
import SteamCanvas from '@/components/SteamCanvas';

interface AnimatedTotalProps {
  value: number;
}

function AnimatedTotal({ value }: AnimatedTotalProps) {
  const count = useMotionValue(value);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const ref = useRef<HTMLSpanElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) {
      count.set(value);
      if (ref.current) ref.current.textContent = `₹${value}`;
      return;
    }
    const controls = animate(count, value, { duration: 0.25, ease: 'easeOut' });
    return () => controls.stop();
  }, [value, count, shouldReduceMotion]);

  useEffect(() => {
    return rounded.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent = `₹${latest}`;
      }
    });
  }, [rounded]);

  return <span ref={ref} className="tabular-nums">₹{value}</span>;
}

interface MenuItem {
  id: string;
  name: string;
  category: 'SNACKS' | 'BEVERAGES' | 'QUICK_MEALS' | 'CHINESE' | 'CUSTOM';
  costPrice: number;
  sellPrice: number;
  isAvailable: boolean;
  imageUrl: string | null;
}

interface CartItem {
  menuItemId: string;
  name: string;
  sellPrice: number;
  quantity: number;
}

interface OrderClientProps {
  initialMenuItems: MenuItem[];
  initialWindows: {
    MORNING_11AM: DeliveryWindowOption;
    AFTERNOON_4PM: DeliveryWindowOption;
  };
  dbError: boolean;
}

const CATEGORIES_ORDER = [
  { id: 'SNACKS', label: 'Snacks' },
  { id: 'BEVERAGES', label: 'Beverages' },
  { id: 'QUICK_MEALS', label: 'Quick Meals' },
  { id: 'CHINESE', label: 'Chinese' },
  { id: 'CUSTOM', label: 'Custom' },
];

export default function OrderClient({ initialMenuItems, initialWindows, dbError }: OrderClientProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [selectedWindow, setSelectedWindow] = useState<'MORNING_11AM' | 'AFTERNOON_4PM'>('MORNING_11AM');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customRequest, setCustomRequest] = useState('');
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('parkbite_cart');
      const savedWindow = localStorage.getItem('parkbite_window');
      const savedRequestRaw = localStorage.getItem('parkbite_custom_request_raw');
      const savedExtras = localStorage.getItem('parkbite_selected_extras');

      if (savedCart) setCart(JSON.parse(savedCart));
      if (savedWindow) setSelectedWindow(savedWindow as any);
      if (savedRequestRaw) setCustomRequest(savedRequestRaw);
      if (savedExtras) setSelectedExtras(JSON.parse(savedExtras));
    } catch (e) {
      console.error('Failed to load cart from localStorage', e);
    }
  }, []);

  // Save cart to localStorage whenever it changes
  const saveCartToStorage = (newCart: CartItem[]) => {
    localStorage.setItem('parkbite_cart', JSON.stringify(newCart));
  };

  const saveWindowToStorage = (windowId: 'MORNING_11AM' | 'AFTERNOON_4PM') => {
    localStorage.setItem('parkbite_window', windowId);
  };

  const handleToggleExtra = (extra: string) => {
    let next: string[];
    if (selectedExtras.includes(extra)) {
      next = selectedExtras.filter((e) => e !== extra);
    } else {
      next = [...selectedExtras, extra];
    }
    setSelectedExtras(next);
    localStorage.setItem('parkbite_selected_extras', JSON.stringify(next));
  };

  const handleAdd = (item: MenuItem) => {
    const existingIndex = cart.findIndex((i) => i.menuItemId === item.id);
    let newCart = [...cart];
    if (existingIndex > -1) {
      newCart[existingIndex].quantity += 1;
    } else {
      newCart.push({
        menuItemId: item.id,
        name: item.name,
        sellPrice: item.sellPrice,
        quantity: 1,
      });
    }
    setCart(newCart);
    saveCartToStorage(newCart);
  };

  const handleRemove = (itemId: string) => {
    const existingIndex = cart.findIndex((i) => i.menuItemId === itemId);
    if (existingIndex === -1) return;

    let newCart = [...cart];
    if (newCart[existingIndex].quantity > 1) {
      newCart[existingIndex].quantity -= 1;
    } else {
      newCart = newCart.filter((i) => i.menuItemId !== itemId);
    }
    setCart(newCart);
    saveCartToStorage(newCart);
  };

  const handleUpdateQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      const newCart = cart.filter((i) => i.menuItemId !== itemId);
      setCart(newCart);
      saveCartToStorage(newCart);
    } else {
      const newCart = cart.map((i) => 
        i.menuItemId === itemId ? { ...i, quantity: newQty } : i
      );
      setCart(newCart);
      saveCartToStorage(newCart);
    }
  };

  const getQuantity = (itemId: string) => {
    const item = cart.find((i) => i.menuItemId === itemId);
    return item ? item.quantity : 0;
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.sellPrice * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const activeWindowInfo = initialWindows[selectedWindow];

  const handlePlaceOrder = () => {
    if (cart.length === 0) return;

    let finalRequest = '';
    if (selectedExtras.length > 0) {
      finalRequest += `Extra Items: ${selectedExtras.join(', ')}`;
    }
    if (customRequest.trim()) {
      if (finalRequest) finalRequest += '. ';
      finalRequest += `Notes: ${customRequest.trim()}`;
    }

    // Save target window options and merged customRequest for checkout
    localStorage.setItem('parkbite_target_date', activeWindowInfo.targetDate);
    localStorage.setItem('parkbite_window_label', activeWindowInfo.label);
    localStorage.setItem('parkbite_custom_request', finalRequest);
    router.push('/order/checkout');
  };

  // Group items by category
  const groupedItems = CATEGORIES_ORDER.reduce((acc, cat) => {
    acc[cat.id] = initialMenuItems.filter((item) => item.category === cat.id);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header Banner */}
      <header className="bg-brand-deep text-bg-warm py-6 px-4 shadow-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2 relative">
              <span className="relative">
                🍜
                <SteamCanvas />
              </span>
              <span className="font-display">ParkBite Express</span>
            </h1>
            <p className="text-sm opacity-80 mt-1">Hyperlocal fresh food delivered straight to your IT park desk</p>
          </div>
          
          {/* Delivery Window Picker */}
          <div className="bg-bg-warm/10 p-1.5 rounded-lg flex items-center gap-1 border border-bg-warm/20">
            <button
              id="btn-window-morning"
              onClick={() => {
                setSelectedWindow('MORNING_11AM');
                saveWindowToStorage('MORNING_11AM');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                selectedWindow === 'MORNING_11AM'
                  ? 'bg-brand-accent text-bg-warm shadow'
                  : 'text-bg-warm hover:bg-bg-warm/5'
              }`}
            >
              ☀️ {initialWindows.MORNING_11AM.label}
            </button>
            <button
              id="btn-window-afternoon"
              onClick={() => {
                setSelectedWindow('AFTERNOON_4PM');
                saveWindowToStorage('AFTERNOON_4PM');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                selectedWindow === 'AFTERNOON_4PM'
                  ? 'bg-brand-accent text-bg-warm shadow'
                  : 'text-bg-warm hover:bg-bg-warm/5'
              }`}
            >
              ☕ {initialWindows.AFTERNOON_4PM.label}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 py-8 flex-grow w-full flex flex-col md:flex-row gap-8">
        
        {/* Left Column: Menu Items */}
        <div className="w-full md:w-2/3 flex flex-col gap-8">
          
          {dbError && (
            <div className="bg-alert/15 border border-alert text-ink p-4 rounded-lg flex items-start gap-3">
              <AlertTriangle className="text-alert shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-alert">Setup Mode / Connection Offline</h3>
                <p className="text-sm opacity-90 mt-0.5">
                  Database is currently being configured. We are displaying placeholders or menu items will load once setup is completed.
                </p>
              </div>
            </div>
          )}

          {/* Quick Category Anchors */}
          <nav className="flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-brand-deep/10">
            {CATEGORIES_ORDER.map((cat) => {
              const hasItems = (groupedItems[cat.id] || []).length > 0;
              if (!hasItems && !dbError) return null;
              return (
                <a
                  key={cat.id}
                  href={`#category-${cat.id}`}
                  className="px-4 py-1.5 bg-brand-deep/5 hover:bg-brand-deep/10 rounded-full text-xs font-medium whitespace-nowrap text-brand-deep shrink-0 transition"
                >
                  {cat.label}
                </a>
              );
            })}
          </nav>

          {/* Menu Sections */}
          <div className="flex flex-col gap-10">
            {CATEGORIES_ORDER.map((cat) => {
              const items = groupedItems[cat.id] || [];
              if (items.length === 0 && !dbError) return null;

              return (
                <section key={cat.id} id={`#category-${cat.id}`} className="scroll-mt-24">
                  <h2 className="text-xl font-bold border-b border-brand-deep/10 pb-2 mb-4 text-brand-deep uppercase tracking-wider text-xs">
                    {cat.label}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {items.length > 0 ? (
                      items.map((item) => {
                        const qty = getQuantity(item.id);
                        return (
                          <div
                            key={item.id}
                            className="bg-white p-4 rounded-xl shadow-xs border border-brand-deep/5 flex justify-between items-center gap-4 hover:shadow transition"
                          >
                            <div className="flex-grow">
                              <h3 className="font-semibold text-brand-deep text-md">{item.name}</h3>
                              <p className="text-sm font-bold text-brand-accent mt-1 tabular-nums">₹{item.sellPrice}</p>
                            </div>
                            <div className="shrink-0">
                              {qty > 0 ? (
                                <div className="flex items-center gap-2 bg-brand-deep/5 px-2 py-1 rounded-lg border border-brand-deep/10">
                                  <motion.button
                                    whileTap={shouldReduceMotion ? {} : { scale: 0.85 }}
                                    onClick={() => handleRemove(item.id)}
                                    className="p-1 text-brand-deep hover:text-brand-accent transition cursor-pointer animate-none"
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus size={16} />
                                  </motion.button>
                                  <span className="font-bold text-sm min-w-[20px] text-center tabular-nums">{qty}</span>
                                  <motion.button
                                    whileTap={shouldReduceMotion ? {} : { scale: 0.85 }}
                                    onClick={() => handleAdd(item)}
                                    className="p-1 text-brand-deep hover:text-brand-accent transition cursor-pointer animate-none"
                                    aria-label="Increase quantity"
                                  >
                                    <Plus size={16} />
                                  </motion.button>
                                </div>
                              ) : (
                                <motion.button
                                  whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
                                  onClick={() => handleAdd(item)}
                                  className="px-4 py-1.5 bg-brand-deep hover:bg-brand-deep/90 text-bg-warm font-semibold text-xs rounded-lg shadow-sm transition cursor-pointer"
                                >
                                  Add
                                </motion.button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      // Fallback placeholders for empty category
                      dbError && (
                        <p className="text-sm text-ink/50 italic col-span-2">No items listed in {cat.label} yet.</p>
                      )
                    )}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Bounded custom request field */}
          <div className="bg-white p-5 rounded-xl shadow-xs border border-brand-deep/5 mt-4 flex flex-col gap-4">
            <div>
              <h3 className="block text-sm font-semibold text-brand-deep mb-2">
                Want something not on the menu? Select pre-approved extras:
              </h3>
              <div className="flex flex-wrap gap-2">
                {['Cold coffee', 'Poha', 'Extra chutney'].map((extra) => {
                  const isSelected = selectedExtras.includes(extra);
                  return (
                    <button
                      key={extra}
                      type="button"
                      onClick={() => handleToggleExtra(extra)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                        isSelected
                          ? 'bg-brand-accent border-brand-accent text-bg-warm shadow-xs font-bold'
                          : 'bg-bg-warm/30 border-brand-deep/10 text-brand-deep hover:bg-bg-warm/50'
                      }`}
                    >
                      {extra}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="custom-request" className="block text-sm font-semibold text-brand-deep mb-2">
                Something else? We'll try, but it's not guaranteed
              </label>
              <textarea
                id="custom-request"
                rows={3}
                placeholder="e.g. Extra hot milk tea, single sandwich without onions..."
                value={customRequest}
                onChange={(e) => {
                  setCustomRequest(e.target.value);
                  localStorage.setItem('parkbite_custom_request_raw', e.target.value);
                }}
                className="w-full p-3 rounded-lg bg-bg-warm/30 border border-brand-deep/10 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent focus:outline-hidden text-sm resize-none"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Order Slip (Desktop) */}
        <div className="hidden md:block w-1/3 shrink-0">
          <div className="bg-white p-6 rounded-xl border border-brand-deep/10 shadow-xs sticky top-28 flex flex-col gap-6">
            <h2 className="text-lg font-bold text-brand-deep border-b border-brand-deep/10 pb-3 flex items-center gap-2">
              <ShoppingBag size={20} className="text-brand-accent" />
              Order Slip
            </h2>

            {/* Window Context */}
            <div className="bg-bg-warm p-3 rounded-lg flex items-start gap-2 border border-brand-deep/5">
              <Info size={16} className="text-brand-accent shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold block text-brand-deep">Delivery Target:</span>
                <span className="opacity-90">{activeWindowInfo.label}</span>
              </div>
            </div>

            {/* Cart Items List */}
            {cart.length > 0 ? (
              <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {cart.map((item) => (
                    <motion.div
                      key={item.menuItemId}
                      layout={!shouldReduceMotion}
                      initial={shouldReduceMotion ? {} : { opacity: 0, y: 15 }}
                      animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
                      exit={shouldReduceMotion ? {} : { opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.15 }}
                      className="flex justify-between items-center gap-4 text-sm"
                    >
                      <div className="flex-grow">
                        <p className="font-medium text-brand-deep">{item.name}</p>
                        <p className="text-xs opacity-60 tabular-nums">₹{item.sellPrice} each</p>
                      </div>
                      <div className="flex items-center gap-2 border border-brand-deep/5 px-2 py-0.5 rounded-md">
                        <motion.button
                          whileTap={shouldReduceMotion ? {} : { scale: 0.85 }}
                          onClick={() => handleRemove(item.menuItemId)}
                          className="text-brand-deep/60 hover:text-brand-accent cursor-pointer animate-none"
                        >
                          <Minus size={14} />
                        </motion.button>
                        <span className="font-bold min-w-[15px] text-center text-xs tabular-nums">{item.quantity}</span>
                        <motion.button
                          whileTap={shouldReduceMotion ? {} : { scale: 0.85 }}
                          onClick={() => {
                            const originalItem = initialMenuItems.find((i) => i.id === item.menuItemId);
                            if (originalItem) handleAdd(originalItem);
                          }}
                          className="text-brand-deep/60 hover:text-brand-accent cursor-pointer animate-none"
                        >
                          <Plus size={14} />
                        </motion.button>
                      </div>
                      <p className="font-semibold text-right text-brand-deep min-w-[50px] tabular-nums">
                        ₹{item.sellPrice * item.quantity}
                      </p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <p className="text-sm opacity-60 text-center py-8">
                Nothing yet — add something tasty from the menu.
              </p>
            )}

            {/* Total Section */}
            {cart.length > 0 && (
              <div className="border-t border-brand-deep/10 pt-4 flex flex-col gap-4">
                <div className="flex justify-between items-center font-bold text-brand-deep">
                  <span>Grand Total</span>
                  <AnimatedTotal value={cartTotal} />
                </div>

                <button
                  onClick={handlePlaceOrder}
                  className="w-full py-3 bg-brand-accent hover:bg-brand-accent/90 text-bg-warm font-bold text-center rounded-lg shadow transition duration-200"
                >
                  Place order
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Cart Bar & Bottom Drawer */}
      {cart.length > 0 && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-brand-deep/10 p-4 shadow-lg z-50 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs opacity-75 font-semibold text-brand-deep">
                {cartItemCount} item{cartItemCount > 1 ? 's' : ''} for {activeWindowInfo.label}
              </p>
              <div className="text-lg font-bold text-brand-deep">
                <AnimatedTotal value={cartTotal} />
              </div>
            </div>
            <button
              onClick={() => setIsMobileCartOpen(!isMobileCartOpen)}
              className="px-3 py-1.5 border border-brand-deep/20 rounded-lg text-xs font-semibold text-brand-deep cursor-pointer"
            >
              {isMobileCartOpen ? 'Hide Slip' : 'View Slip'}
            </button>
            <button
              onClick={handlePlaceOrder}
              className="px-5 py-2.5 bg-brand-accent hover:bg-brand-accent/90 text-bg-warm font-bold rounded-lg text-sm shadow transition cursor-pointer"
            >
              Checkout
            </button>
          </div>

          {/* Drawer content when expanded */}
          {isMobileCartOpen && (
            <div className="border-t border-brand-deep/10 pt-3 flex flex-col gap-3 max-h-[220px] overflow-y-auto">
              <AnimatePresence initial={false}>
                {cart.map((item) => (
                  <motion.div
                    key={item.menuItemId}
                    layout={!shouldReduceMotion}
                    initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
                    animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
                    exit={shouldReduceMotion ? {} : { opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.12 }}
                    className="flex justify-between items-center gap-3 text-xs animate-none"
                  >
                    <span className="font-semibold text-brand-deep flex-grow">{item.name}</span>
                    <div className="flex items-center gap-2 border border-brand-deep/5 px-2 py-0.5 rounded-md shrink-0">
                      <motion.button
                        whileTap={shouldReduceMotion ? {} : { scale: 0.85 }}
                        onClick={() => handleRemove(item.menuItemId)}
                        className="text-brand-deep/60 cursor-pointer animate-none"
                      >
                        <Minus size={12} />
                      </motion.button>
                      <span className="font-bold min-w-[12px] text-center tabular-nums">{item.quantity}</span>
                      <motion.button
                        whileTap={shouldReduceMotion ? {} : { scale: 0.85 }}
                        onClick={() => {
                          const originalItem = initialMenuItems.find((i) => i.id === item.menuItemId);
                          if (originalItem) handleAdd(originalItem);
                        }}
                        className="text-brand-deep/60 cursor-pointer animate-none"
                      >
                        <Plus size={12} />
                      </motion.button>
                    </div>
                    <span className="font-semibold text-right min-w-[40px] tabular-nums">₹{item.sellPrice * item.quantity}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
