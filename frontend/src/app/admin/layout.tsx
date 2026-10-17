'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Laptop,
  Boxes,
  Database,
  ArrowLeft,
  ShieldCheck,
  ExternalLink,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { logout, user } = useAuthStore();

  const navItems = [
    {
      href: '/admin',
      label: 'Tổng quan Dashboard',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: '/admin/orders',
      label: 'Quản lý Đơn hàng',
      icon: ShoppingBag,
      exact: false,
    },
    {
      href: '/admin/products',
      label: 'Sản phẩm & Cấu hình',
      icon: Laptop,
      exact: false,
    },
    {
      href: '/admin/inventory',
      label: 'Quản lý Kho & Tồn kho',
      icon: Boxes,
      exact: false,
    },
    {
      href: '/admin/knowledge',
      label: 'Tri thức AI (RAG Docs)',
      icon: Database,
      exact: false,
    },
  ];

  const isActive = (item: (typeof navItems)[0]) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <div className="min-h-screen md:h-screen bg-slate-100 flex flex-col md:flex-row text-slate-900 font-sans md:overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 md:h-screen md:sticky md:top-0 overflow-y-auto z-20">
        {/* Brand Area */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo-bkstore.png"
              alt="BK-Store Admin"
              className="w-9 h-9 rounded-xl object-contain bg-white/10 p-0.5"
            />
            <div>
              <div className="text-sm font-extrabold text-white tracking-tight flex items-center gap-1.5">
                <span>BK-STORE</span>
                <span className="px-1.5 py-0.5 text-[9px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded">
                  ADMIN
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400">Hệ thống Quản trị</div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Return to Storefront & System Status */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
            <span>Về trang Khách hàng</span>
          </Link>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400 font-mono space-y-1">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                API Core:
              </span>
              <span className="text-emerald-400 font-bold">Online</span>
            </div>
            <div className="text-[10px] text-slate-500">Đồ án: BK-Store CNTT</div>
          </div>
        </div>
      </aside>

      {/* Main Admin Area */}
      <div className="flex-1 flex flex-col min-w-0 md:h-screen md:overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-xs z-10 sticky top-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="text-slate-400">BK-Store Admin</span>
            <span>/</span>
            <span className="text-slate-800 font-bold">
              {navItems.find((i) => isActive(i))?.label || 'Bảng điều khiển'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              target="_blank"
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
            >
              <span>Xem Storefront</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-800 leading-tight">{user?.name || 'Quản Trị Viên'}</span>
                <span className="text-[10px] text-slate-500 font-mono">Bắc & Kiệt</span>
              </div>
            </div>

            <button
              onClick={() => logout(true)}
              title="Đăng xuất khỏi trang Quản trị"
              className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
