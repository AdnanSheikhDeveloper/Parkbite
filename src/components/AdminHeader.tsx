'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, UtensilsCrossed, BarChart3, ExternalLink, LogOut } from 'lucide-react';
import { logoutAdmin } from '@/app/admin/actions';

export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await logoutAdmin();
    router.push('/admin');
  };

  const navItems = [
    { href: '/admin/orders', label: 'Orders Dashboard', icon: LayoutDashboard },
    { href: '/admin/menu', label: 'Manage Menu', icon: UtensilsCrossed },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <header className="bg-brand-deep text-bg-warm py-4 px-6 shadow-md">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Title */}
        <div className="flex items-center justify-between">
          <Link href="/admin/orders" className="text-xl font-bold flex items-center gap-2">
            🔑 ParkBite Admin
          </Link>
          <button 
            onClick={handleLogout}
            className="md:hidden text-bg-warm/80 hover:text-brand-accent p-1 transition"
            aria-label="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>

        {/* Navigation & Logout */}
        <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
          <nav className="flex gap-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    isActive 
                      ? 'bg-brand-accent text-bg-warm shadow-sm' 
                      : 'text-bg-warm/85 hover:bg-bg-warm/10'
                  }`}
                >
                  <Icon size={14} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-4 border-l border-bg-warm/20 pl-4">
            <Link
              href="/order"
              target="_blank"
              className="text-xs font-medium text-bg-warm/80 hover:text-brand-accent flex items-center gap-1 transition"
            >
              <ExternalLink size={12} />
              Storefront
            </Link>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 border border-bg-warm/20 hover:border-brand-accent rounded-lg text-xs font-semibold text-bg-warm/90 hover:text-brand-accent transition flex items-center gap-1"
            >
              <LogOut size={12} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
