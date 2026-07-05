'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { placeOrder } from './actions';

interface CartItem {
  menuItemId: string;
  name: string;
  sellPrice: number;
  quantity: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [deliveryWindow, setDeliveryWindow] = useState<'MORNING_11AM' | 'AFTERNOON_4PM'>('MORNING_11AM');
  const [windowLabel, setWindowLabel] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [customRequest, setCustomRequest] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [companyAndFloor, setCompanyAndFloor] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI_QR'>('UPI_QR');

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('parkbite_cart');
      const savedWindow = localStorage.getItem('parkbite_window');
      const savedWindowLabel = localStorage.getItem('parkbite_window_label');
      const savedTargetDate = localStorage.getItem('parkbite_target_date');
      const savedRequest = localStorage.getItem('parkbite_custom_request');

      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        if (parsed.length === 0) {
          router.replace('/order');
          return;
        }
        setCart(parsed);
      } else {
        router.replace('/order');
        return;
      }

      if (savedWindow) setDeliveryWindow(savedWindow as any);
      if (savedWindowLabel) setWindowLabel(savedWindowLabel);
      if (savedTargetDate) setTargetDate(savedTargetDate);
      if (savedRequest) setCustomRequest(savedRequest);
    } catch (e) {
      console.error('Failed to load checkout state', e);
      router.replace('/order');
    }
  }, [router]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Full name is required';
    if (!companyAndFloor.trim()) newErrors.companyAndFloor = 'Company & Floor details are required';
    
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!cleanPhone) {
      newErrors.phone = 'Phone number is required';
    } else if (cleanPhone.length !== 10) {
      newErrors.phone = 'Please enter a valid 10-digit mobile number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setServerError('');

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const result = await placeOrder({
        name,
        phone,
        companyAndFloor,
        deliveryWindow,
        targetDate,
        paymentMethod,
        customRequest: customRequest || undefined,
        items: cart.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
      });

      if (result.success && result.orderId) {
        // Clear local storage cart
        localStorage.removeItem('parkbite_cart');
        localStorage.removeItem('parkbite_custom_request');
        router.push(`/order/track/${result.orderId}?new=true`);
      } else {
        setServerError(result.error || 'Something went wrong while placing your order.');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Failed to submit order', err);
      setServerError('A network error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.sellPrice * item.quantity, 0);

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-warm">
        <Loader2 className="animate-spin text-brand-accent" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-warm flex flex-col">
      {/* Header */}
      <header className="bg-brand-deep text-bg-warm py-4 px-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/order" className="text-bg-warm hover:text-brand-accent transition">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold">Checkout Details</h1>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 py-8 flex-grow w-full grid grid-cols-1 md:grid-cols-5 gap-8">
        
        {/* Left Column: Form (3 cols) */}
        <form onSubmit={handleSubmit} className="md:col-span-3 bg-white p-6 rounded-xl border border-brand-deep/5 shadow-xs flex flex-col gap-6 order-2 md:order-1">
          <h2 className="text-lg font-bold text-brand-deep border-b border-brand-deep/10 pb-2">
            Delivery & Contact Info
          </h2>

          {serverError && (
            <div className="bg-alert/15 border border-alert text-ink p-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="text-alert shrink-0 mt-0.5" size={18} />
              <span className="text-sm font-medium">{serverError}</span>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-brand-deep mb-1">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="e.g. Rohan Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full p-2.5 rounded-lg border focus:outline-hidden text-sm ${
                errors.name 
                  ? 'border-alert focus:border-alert focus:ring-1 focus:ring-alert bg-alert/5' 
                  : 'border-brand-deep/10 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-bg-warm/10'
              }`}
            />
            {errors.name && <p className="text-alert text-xs mt-1 font-medium">{errors.name}</p>}
          </div>

          {/* Company & Floor */}
          <div>
            <label htmlFor="company" className="block text-sm font-semibold text-brand-deep mb-1">
              Company & Floor
            </label>
            <input
              id="company"
              type="text"
              placeholder="e.g. TCS (C-Block), 4th Floor"
              value={companyAndFloor}
              onChange={(e) => setCompanyAndFloor(e.target.value)}
              className={`w-full p-2.5 rounded-lg border focus:outline-hidden text-sm ${
                errors.companyAndFloor 
                  ? 'border-alert focus:border-alert focus:ring-1 focus:ring-alert bg-alert/5' 
                  : 'border-brand-deep/10 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-bg-warm/10'
              }`}
            />
            {errors.companyAndFloor && <p className="text-alert text-xs mt-1 font-medium">{errors.companyAndFloor}</p>}
          </div>

          {/* 10-Digit Mobile */}
          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-brand-deep mb-1">
              10-Digit Mobile Number
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-sm font-semibold opacity-65">+91</span>
              <input
                id="phone"
                type="tel"
                placeholder="9876543210"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className={`w-full pl-12 pr-3 py-2.5 rounded-lg border focus:outline-hidden text-sm font-semibold ${
                  errors.phone 
                    ? 'border-alert focus:border-alert focus:ring-1 focus:ring-alert bg-alert/5' 
                    : 'border-brand-deep/10 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent bg-bg-warm/10'
                }`}
              />
            </div>
            {errors.phone && <p className="text-alert text-xs mt-1 font-medium">{errors.phone}</p>}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-semibold text-brand-deep mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition ${
                paymentMethod === 'UPI_QR' 
                  ? 'border-brand-accent bg-brand-accent/5 font-semibold text-brand-deep' 
                  : 'border-brand-deep/10 hover:bg-bg-warm/10'
              }`}>
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'UPI_QR'}
                  onChange={() => setPaymentMethod('UPI_QR')}
                  className="accent-brand-accent"
                />
                <div className="text-xs">
                  <span className="block">Pay by UPI QR</span>
                  <span className="opacity-60 text-[10px]">Scan QR code after placing order</span>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition ${
                paymentMethod === 'CASH' 
                  ? 'border-brand-accent bg-brand-accent/5 font-semibold text-brand-deep' 
                  : 'border-brand-deep/10 hover:bg-bg-warm/10'
              }`}>
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'CASH'}
                  onChange={() => setPaymentMethod('CASH')}
                  className="accent-brand-accent"
                />
                <div className="text-xs">
                  <span className="block">Pay cash at delivery</span>
                  <span className="opacity-60 text-[10px]">Pay physical cash to delivery rider</span>
                </div>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 bg-brand-accent hover:bg-brand-accent/90 text-bg-warm font-bold text-center rounded-lg shadow transition duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Placing your order...
              </>
            ) : (
              'Confirm Order'
            )}
          </button>
        </form>

        {/* Right Column: Order Summary (2 cols) */}
        <div className="md:col-span-2 flex flex-col gap-6 order-1 md:order-2">
          <div className="bg-white p-5 rounded-xl border border-brand-deep/10 shadow-xs flex flex-col gap-4">
            <h2 className="text-md font-bold text-brand-deep border-b border-brand-deep/10 pb-2 flex items-center gap-2">
              <ShoppingBag size={18} className="text-brand-accent" />
              Order Summary
            </h2>

            {/* Delivery Window Info */}
            <div className="text-xs bg-bg-warm p-3 rounded-lg border border-brand-deep/5">
              <p className="font-semibold text-brand-deep">Scheduled Delivery Window:</p>
              <p className="opacity-80 mt-0.5">{windowLabel || 'Loading...'}</p>
            </div>

            {/* Items summary */}
            <div className="flex flex-col gap-3 max-h-[200px] overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.menuItemId} className="flex justify-between items-center text-xs text-brand-deep">
                  <span className="font-medium flex-grow truncate">{item.name} <span className="opacity-60">x {item.quantity}</span></span>
                  <span className="font-semibold shrink-0">₹{item.sellPrice * item.quantity}</span>
                </div>
              ))}
            </div>

            {/* Custom Request Summary */}
            {customRequest && (
              <div className="text-xs border-t border-brand-deep/5 pt-3">
                <p className="font-semibold text-brand-deep">Custom Note:</p>
                <p className="opacity-75 italic mt-0.5 bg-bg-warm/30 p-2 rounded-md border border-brand-deep/5">"{customRequest}"</p>
              </div>
            )}

            {/* Total */}
            <div className="border-t border-brand-deep/10 pt-3 flex justify-between items-center font-bold text-sm text-brand-deep">
              <span>Total to Pay</span>
              <span>₹{cartTotal}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
