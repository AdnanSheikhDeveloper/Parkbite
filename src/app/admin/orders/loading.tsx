export default function AdminOrdersLoading() {
  return (
    <div className="min-h-screen bg-bg-warm flex flex-col">
      {/* Header Skeleton */}
      <header className="bg-brand-deep text-bg-warm py-4 px-6 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="h-6 w-36 bg-white/20 rounded-md animate-pulse" />
          <div className="h-8 w-24 bg-white/10 rounded-md animate-pulse" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 flex-grow w-full flex flex-col gap-6">
        {/* Title row */}
        <div className="flex justify-between items-center border-b border-brand-deep/10 pb-4">
          <div className="flex flex-col gap-2">
            <div className="h-7 w-64 bg-brand-deep/10 rounded-md animate-pulse" />
            <div className="h-4 w-96 bg-brand-deep/5 rounded-md animate-pulse" />
          </div>
          <div className="h-9 w-24 bg-brand-deep/10 rounded-md animate-pulse" />
        </div>

        {/* Filter Bar */}
        <div className="h-12 w-full bg-white rounded-xl border border-brand-deep/5 animate-pulse" />

        {/* Delivery Window Sections */}
        {[1, 2].map((section) => (
          <section key={section} className="flex flex-col gap-4">
            {/* Header bar */}
            <div className="bg-brand-deep p-4 rounded-xl shadow-sm flex justify-between items-center">
              <div className="h-5 w-48 bg-white/20 rounded-sm animate-pulse" />
              <div className="h-6 w-32 bg-white/10 rounded-md animate-pulse" />
            </div>

            {/* Order cards */}
            {[1, 2].map((batch) => (
              <div key={batch} className="bg-white rounded-xl border border-brand-deep/5 overflow-hidden flex flex-col">
                <div className="bg-bg-warm/30 px-5 py-3 border-b border-brand-deep/5 flex items-center gap-2">
                  <div className="h-4 w-4 bg-brand-deep/10 rounded-full animate-pulse" />
                  <div className="h-4 w-36 bg-brand-deep/10 rounded-md animate-pulse" />
                </div>
                <div className="divide-y divide-brand-deep/5">
                  {[1, 2].map((item) => (
                    <div key={item} className="p-5 flex justify-between items-center gap-4">
                      <div className="flex flex-col gap-2 flex-grow">
                        <div className="h-5 w-40 bg-brand-deep/10 rounded-md animate-pulse" />
                        <div className="h-4 w-72 bg-brand-deep/5 rounded-md animate-pulse" />
                      </div>
                      <div className="h-8 w-24 bg-brand-deep/10 rounded-lg animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))}
      </main>
    </div>
  );
}
