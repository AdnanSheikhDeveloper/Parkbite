import { ShoppingBag } from 'lucide-react';

export default function OrderLoading() {
  return (
    <div className="min-h-screen bg-bg-warm">
      {/* Header Skeleton */}
      <header className="bg-brand-deep text-bg-warm py-6 px-4 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="h-8 w-48 bg-white/20 rounded-md animate-pulse" />
            <div className="h-4 w-72 bg-white/10 rounded-md animate-pulse" />
          </div>
          <div className="h-9 w-60 bg-white/10 rounded-lg animate-pulse" />
        </div>
      </header>

      {/* Main Grid Skeleton */}
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Left Column: Menu Items */}
        <div className="flex-grow flex flex-col gap-6">
          <div className="h-8 w-32 bg-brand-deep/10 rounded-full animate-pulse" />

          {/* nav links */}
          <div className="flex gap-2 pb-2 border-b border-brand-deep/10">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-7 w-20 bg-brand-deep/10 rounded-full animate-pulse" />
            ))}
          </div>

          {/* menu items grid */}
          <div className="flex flex-col gap-8">
            {[1, 2].map((section) => (
              <div key={section} className="flex flex-col gap-4">
                <div className="h-5 w-24 bg-brand-deep/10 rounded-sm animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="bg-white p-4 rounded-xl border border-brand-deep/5 flex justify-between items-center gap-4 shadow-xs">
                      <div className="flex flex-col gap-2 flex-grow">
                        <div className="h-4 w-32 bg-brand-deep/10 rounded-md animate-pulse" />
                        <div className="h-4 w-12 bg-brand-accent/20 rounded-md animate-pulse" />
                      </div>
                      <div className="h-8 w-16 bg-brand-deep/10 rounded-lg animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Order Slip */}
        <div className="hidden md:block w-1/3 shrink-0">
          <div className="bg-white p-6 rounded-xl border border-brand-deep/10 shadow-xs flex flex-col gap-6">
            <div className="h-6 w-28 bg-brand-deep/10 rounded-md animate-pulse" />
            <div className="h-12 w-full bg-brand-deep/5 rounded-lg animate-pulse" />
            <div className="h-20 w-full bg-brand-deep/5 rounded-lg animate-pulse" />
          </div>
        </div>

      </div>
    </div>
  );
}
