'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, BarChart2, TrendingUp, Compass, Star, ChevronLeft, AlertCircle, Sparkles } from 'lucide-react';
import AdminHeader from '@/components/AdminHeader';

interface DailyRevenue {
  date: string;
  amount: number;
}

interface TopItem {
  name: string;
  quantity: number;
}

interface WindowStats {
  MORNING_11AM: number;
  AFTERNOON_4PM: number;
}

interface AnalyticsClientProps {
  initialStartDate: string;
  initialEndDate: string;
  dailyRevenue: DailyRevenue[];
  topItems: TopItem[];
  windowStats: WindowStats;
  feedbackRating: number;
  feedbackCount: number;
  repeatOrderRate: number;
  totalActiveCustomers: number;
  repeatCustomersCount: number;
  dbError: boolean;
}

export default function AnalyticsClient({
  initialStartDate,
  initialEndDate,
  dailyRevenue,
  topItems,
  windowStats,
  feedbackRating,
  feedbackCount,
  repeatOrderRate,
  totalActiveCustomers,
  repeatCustomersCount,
  dbError,
}: AnalyticsClientProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    router.push(`/admin/analytics?startDate=${startDate}&endDate=${endDate}`);
    setTimeout(() => setIsUpdating(false), 800);
  };

  const hasPostHog = typeof process !== 'undefined' && 
    process.env.NEXT_PUBLIC_POSTHOG_KEY && 
    process.env.NEXT_PUBLIC_POSTHOG_KEY !== 'phc_placeholder_key';

  const maxRevenue = dailyRevenue.length > 0 ? Math.max(...dailyRevenue.map((d) => d.amount)) : 1;
  const maxQty = topItems.length > 0 ? Math.max(...topItems.map((i) => i.quantity)) : 1;
  const totalWindowOrders = windowStats.MORNING_11AM + windowStats.AFTERNOON_4PM;
  
  const morningPct = totalWindowOrders > 0 ? Math.round((windowStats.MORNING_11AM / totalWindowOrders) * 100) : 0;
  const afternoonPct = totalWindowOrders > 0 ? Math.round((windowStats.AFTERNOON_4PM / totalWindowOrders) * 100) : 0;

  return (
    <div className="min-h-screen bg-bg-warm flex flex-col font-sans">
      <AdminHeader />

      <main className="max-w-6xl mx-auto px-4 py-8 flex-grow w-full flex flex-col gap-6">
        
        {/* Navigation & Title */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-brand-deep/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Link 
                href="/admin/orders" 
                className="text-xs text-brand-accent hover:underline flex items-center gap-0.5 font-bold"
              >
                <ChevronLeft size={14} />
                Orders List
              </Link>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-brand-deep flex items-center gap-2 mt-1">
              📊 Core Business Analytics
            </h1>
          </div>

          {/* Date Selector form */}
          <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-white border border-brand-deep/10 rounded-lg p-1">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="p-1.5 text-xs font-semibold text-brand-deep focus:outline-hidden"
              />
              <span className="text-xs font-bold text-brand-deep/30">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="p-1.5 text-xs font-semibold text-brand-deep focus:outline-hidden"
              />
            </div>
            <button
              type="submit"
              disabled={isUpdating}
              className="py-2.5 px-4 bg-brand-deep hover:bg-brand-deep/90 disabled:opacity-50 text-bg-warm font-bold text-xs rounded-lg shadow-xs transition cursor-pointer"
            >
              {isUpdating ? 'Loading...' : 'Apply Filter'}
            </button>
          </form>
        </div>

        {/* Database error banner */}
        {dbError && (
          <div className="bg-alert/15 border border-alert text-ink p-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="text-alert shrink-0 mt-0.5" size={18} />
            <span className="text-xs font-semibold">Error: Failed to query database logs. Viewing cached placeholder counts.</span>
          </div>
        )}

        {/* PostHog degradation banner */}
        {!hasPostHog && (
          <div className="bg-brand-deep/5 border border-brand-deep/10 text-ink p-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="text-brand-deep/60 shrink-0 mt-0.5" size={16} />
            <span className="text-[11px] font-medium opacity-80">
              Note: PostHog API keys are not configured. Standard customer path tracking and session recordings are disabled. External telemetry will degrade gracefully.
            </span>
          </div>
        )}

        {/* METRICS ROW (North Star Metric Prominent) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* North Star: Repeat Order Rate */}
          <div className="bg-brand-deep text-bg-warm p-6 rounded-xl shadow-md border-2 border-brand-accent/30 flex flex-col justify-between relative overflow-hidden md:col-span-1">
            <div className="absolute right-3 top-3 opacity-15">
              <TrendingUp size={80} className="text-brand-accent" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-brand-accent tracking-widest block mb-1">
                ⭐ North Star Metric
              </span>
              <h3 className="text-md font-bold leading-tight">Repeat Customer Rate</h3>
              <p className="text-[11px] opacity-75 mt-1 leading-relaxed">
                % of active customers placing 3 or more orders in any rolling 7-day period.
              </p>
            </div>
            <div className="mt-6 flex items-baseline gap-2">
              <span className="text-5xl font-extrabold tracking-tight tabular-nums text-brand-accent">{repeatOrderRate}%</span>
              <span className="text-xs opacity-75">
                ({repeatCustomersCount} of {totalActiveCustomers} buyers)
              </span>
            </div>
          </div>

          {/* Metric 2: Average Feedback Rating */}
          <div className="bg-white p-6 rounded-xl border border-brand-deep/5 shadow-xs flex flex-col justify-between relative">
            <div className="absolute right-3 top-3 opacity-10">
              <Star size={70} className="text-brand-deep" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-brand-deep/50 tracking-wider block mb-1">
                Feedback Loop
              </span>
              <h3 className="text-md font-bold text-brand-deep">Customer Satisfaction</h3>
              <p className="text-[11px] opacity-70 mt-1 leading-relaxed">
                Average feedback rating submitted by customers on the order delivery confirmation screen.
              </p>
            </div>
            <div className="mt-6 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tracking-tight text-brand-deep tabular-nums">
                {feedbackCount > 0 ? `${feedbackRating} ★` : '—'}
              </span>
              <span className="text-xs opacity-60">
                ({feedbackCount} review{feedbackCount !== 1 ? 's' : ''})
              </span>
            </div>
          </div>

          {/* Metric 3: Total Orders Volume by Delivery Window */}
          <div className="bg-white p-6 rounded-xl border border-brand-deep/5 shadow-xs flex flex-col justify-between relative">
            <div className="absolute right-3 top-3 opacity-10">
              <BarChart2 size={70} className="text-brand-deep" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-brand-deep/50 tracking-wider block mb-1">
                Dispatch Volume
              </span>
              <h3 className="text-md font-bold text-brand-deep">Delivery Windows</h3>
              <p className="text-[11px] opacity-70 mt-1 leading-relaxed">
                Count of active orders target window.
              </p>
            </div>
            
            <div className="mt-6 flex flex-col gap-2">
              <div className="flex justify-between text-xs font-semibold text-brand-deep">
                <span>☀️ Morning 11 AM</span>
                <span className="font-bold tabular-nums">{windowStats.MORNING_11AM} ({morningPct}%)</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-brand-deep border-t border-brand-deep/5 pt-2">
                <span>☕ Afternoon 4 PM</span>
                <span className="font-bold tabular-nums">{windowStats.AFTERNOON_4PM} ({afternoonPct}%)</span>
              </div>
            </div>
          </div>

        </div>

        {/* CHARTS LAYER */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Revenue Chart - Daily Revenue */}
          <div className="bg-white p-6 rounded-xl border border-brand-deep/5 shadow-xs lg:col-span-2 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-brand-deep border-b border-brand-deep/10 pb-2">
              💰 Daily Revenue (Paid Orders)
            </h3>
            
            {dailyRevenue.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs opacity-50 italic">
                No revenue logs registered for this date range.
              </div>
            ) : (
              <div className="flex items-end gap-3 md:gap-6 h-56 pt-6 overflow-x-auto">
                {dailyRevenue.map((day) => {
                  const percentage = maxRevenue > 0 ? (day.amount / maxRevenue) * 100 : 0;
                  return (
                    <div key={day.date} className="flex flex-col items-center gap-2 flex-1 min-w-[60px] h-full justify-end">
                      <div className="w-full bg-brand-deep/5 hover:bg-brand-deep/10 rounded-lg h-36 flex items-end overflow-hidden relative">
                        <div 
                          style={{ height: `${Math.max(percentage, 3)}%` }}
                          className="w-full bg-brand-accent transition-all duration-500 ease-out"
                          title={`₹${day.amount}`}
                        />
                      </div>
                      <span className="text-[9px] font-bold text-brand-deep/60 whitespace-nowrap">{day.date}</span>
                      <span className="text-xs font-bold text-brand-deep tabular-nums">₹{day.amount}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Selling Items */}
          <div className="bg-white p-6 rounded-xl border border-brand-deep/5 shadow-xs lg:col-span-1 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-brand-deep border-b border-brand-deep/10 pb-2">
              🔥 Top-Selling Menu Items
            </h3>

            {topItems.length === 0 ? (
              <div className="flex-grow flex items-center justify-center text-xs opacity-50 italic py-8">
                No product orders logged in this range.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {topItems.map((item, idx) => {
                  const pct = maxQty > 0 ? (item.quantity / maxQty) * 100 : 0;
                  return (
                    <div key={item.name} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs font-semibold text-brand-deep">
                        <span className="truncate pr-2">{idx + 1}. {item.name}</span>
                        <span className="tabular-nums font-bold shrink-0">{item.quantity} units</span>
                      </div>
                      <div className="w-full bg-brand-deep/5 rounded-full h-2">
                        <div 
                          style={{ width: `${pct}%` }} 
                          className="bg-brand-deep h-2 rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </main>
    </div>
  );
}
