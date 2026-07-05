export default function RiderLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-bg-warm pb-16">
      {/* Header Skeleton */}
      <header className="bg-brand-deep text-bg-warm py-4 px-4 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="h-6 w-36 bg-white/20 rounded-md animate-pulse" />
          <div className="h-8 w-16 bg-white/10 rounded-md animate-pulse" />
        </div>
      </header>

      {/* Main Column */}
      <div className="max-w-md mx-auto px-4 py-6 w-full flex-grow flex flex-col gap-6">
        
        {/* Toggle Window Tabs */}
        <div className="bg-white p-1 rounded-xl flex border border-brand-deep/5 animate-pulse h-12" />

        {/* Section Totals */}
        <div className="bg-white p-4 rounded-xl border border-brand-deep/5 animate-pulse h-12" />

        {/* Grouped orders list skeleton */}
        <div className="flex flex-col gap-6">
          {[1, 2].map((group) => (
            <div key={group} className="flex flex-col gap-3">
              {/* Floor Header */}
              <div className="h-4 w-32 bg-brand-deep/10 rounded-md animate-pulse px-1" />

              {/* Order Card */}
              <div className="bg-white rounded-xl border border-brand-deep/10 p-5 flex flex-col gap-4 shadow-xs">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex flex-col gap-2">
                    <div className="h-5 w-28 bg-brand-deep/10 rounded-md animate-pulse" />
                    <div className="h-4 w-20 bg-brand-accent/20 rounded-md animate-pulse" />
                  </div>
                  <div className="h-6 w-16 bg-brand-deep/10 rounded-full animate-pulse" />
                </div>
                
                <div className="h-16 w-full bg-brand-deep/5 rounded-lg animate-pulse" />

                <div className="flex justify-between items-center border-t border-brand-deep/5 pt-3">
                  <div className="flex flex-col gap-1">
                    <div className="h-5 w-12 bg-brand-deep/10 rounded-md animate-pulse" />
                    <div className="h-3 w-16 bg-brand-deep/5 rounded-md animate-pulse" />
                  </div>
                  <div className="h-6 w-12 bg-brand-deep/10 rounded-md animate-pulse" />
                </div>

                <div className="h-10 w-full bg-brand-deep/10 rounded-xl animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
