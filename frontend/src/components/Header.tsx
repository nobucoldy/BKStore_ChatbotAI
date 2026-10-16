'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, ShoppingBag, Truck, Phone, Sparkles, X, ChevronDown, Layers, Star, User as UserIcon, Package, LogOut } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { Brand } from '@/types';
import { fetchBrands, FALLBACK_BRANDS } from '@/lib/api';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenCart: () => void;
  onOpenTracking: () => void;
  onOpenReview?: () => void;
  onOpenChat: () => void;
  onOpenAuth?: () => void;
  onOpenMyOrders?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenCart,
  onOpenTracking,
  onOpenReview,
  onOpenChat,
  onOpenAuth,
  onOpenMyOrders,
}) => {

  const [localSearch, setLocalSearch] = useState(searchQuery);
  const totalItems = useCartStore((state) => state.getTotalItems());
  const [isCartJumping, setIsCartJumping] = useState(false);
  const prevItemsRef = useRef(totalItems);

  // Dynamic Brands state
  const [brands, setBrands] = useState<Brand[]>(FALLBACK_BRANDS);

  useEffect(() => {
    fetchBrands()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setBrands(data);
        }
      })
      .catch(() => {});
  }, []);

  // Dropdown states
  const [isBrandOpen, setIsBrandOpen] = useState(false);
  const [isMobileBrandOpen, setIsMobileBrandOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const brandDropdownRef = useRef<HTMLDivElement>(null);
  const mobileBrandRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const { user, isAuthenticated, logout, openAuthModal } = useAuthStore();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(event.target as Node)) {
        setIsBrandOpen(false);
      }
      if (mobileBrandRef.current && !mobileBrandRef.current.contains(event.target as Node)) {
        setIsMobileBrandOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (totalItems > prevItemsRef.current) {
      setIsCartJumping(true);
      const timer = setTimeout(() => setIsCartJumping(false), 550);
      prevItemsRef.current = totalItems;
      return () => clearTimeout(timer);
    }
    prevItemsRef.current = totalItems;
  }, [totalItems]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(localSearch);
  };

  const handleClearSearch = () => {
    setLocalSearch('');
    onSearchChange('');
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Top Ambient Ticker */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <p className="truncate">
              🚀 Trợ lý ảo AI BK-Bot tư vấn cấu hình chuẩn 24/7 | Miễn phí giao hàng toàn quốc cho đơn từ 1.000.000₫
            </p>
          </div>
          <div className="hidden md:flex items-center gap-6 font-mono text-[11px] text-slate-400">
            <a href="tel:18006868" className="hover:text-white flex items-center gap-1.5 transition-colors">
              <Phone className="w-3 h-3 text-blue-400" />
              <span>Hotline: 1800 6868</span>
            </a>
            <span className="text-slate-700">|</span>
            <button
              onClick={onOpenChat}
              className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <Sparkles className="w-3 h-3 animate-spin" style={{ animationDuration: '4s' }} />
              <span>BK-Bot AI Live</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            BK
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
              BK-STORE
            </span>
            <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-slate-500">
              Smart Tech Commerce
            </span>
          </div>
        </Link>

        {/* Center: Brand Dropdown & Search Bar */}
        <div className="flex-1 max-w-2xl hidden md:flex items-center gap-2.5">
          {/* Brand Dropdown Menu (Dạng trượt xuống) */}
          <div className="relative" ref={brandDropdownRef}>
            <button
              type="button"
              onClick={() => setIsBrandOpen((prev) => !prev)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all border shrink-0 cursor-pointer ${
                isBrandOpen
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200/80 hover:border-slate-300'
              }`}
              title="Danh mục thương hiệu chính hãng"
            >
              <Layers className={`w-3.5 h-3.5 ${isBrandOpen ? 'text-white' : 'text-blue-600'}`} />
              <span>Thương hiệu</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isBrandOpen ? 'rotate-180 text-white' : 'text-slate-400'
                }`}
              />
            </button>

            {/* Slide-Down Menu Panel */}
            {isBrandOpen && (
              <div className="absolute top-full left-0 mt-2.5 w-80 bg-white rounded-3xl shadow-2xl border border-slate-200/90 p-3.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
               

                <div className="grid grid-cols-2 gap-1.5">
                  {brands.map((b) => (
                    <Link
                      key={b.slug}
                      href={`/brands/${b.slug}`}
                      onClick={() => setIsBrandOpen(false)}
                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-blue-50/80 hover:border-blue-200 border border-transparent transition-all group"
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-blue-600 text-slate-700 group-hover:text-white flex items-center justify-center text-xs font-bold font-mono transition-colors shrink-0 shadow-2xs">
                        {b.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 truncate transition-colors">
                          {b.name}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate">
                          {b.description || 'Chính hãng'}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Search Bar Form */}
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <input
              type="text"
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                if (e.target.value === '') onSearchChange('');
              }}
              placeholder="Tìm kiếm MacBook, iPhone, bàn phím cơ, chip M3, RTX 4060..."
              className="w-full bg-slate-100 hover:bg-slate-100/80 focus:bg-white text-sm text-slate-800 placeholder-slate-400 rounded-full pl-11 pr-10 py-2.5 border border-transparent focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            {localSearch && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          {/* 1. Cart Button with text (on left of Avatar) */}
          <button
            onClick={onOpenCart}
            aria-label="Giỏ hàng"
            title={`Giỏ hàng (${totalItems} món)`}
            className={`relative flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm shadow-blue-500/25 transition-all cursor-pointer ${
              isCartJumping ? 'animate-cart-jump ring-4 ring-blue-400/40 shadow-blue-500/50' : ''
            }`}
          >
            <div className="relative">
              <ShoppingBag className={`w-5 h-5 transition-transform ${isCartJumping ? 'scale-125 text-amber-300' : ''}`} />
              {totalItems > 0 && (
                <span
                  className={`absolute -top-2 -right-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full border-2 border-white transition-all ${
                    isCartJumping
                      ? 'scale-125 bg-amber-400 text-slate-950 font-black'
                      : 'bg-rose-500 text-white'
                  }`}
                >
                  {totalItems}
                </span>
              )}
            </div>
            <span className="hidden sm:inline">Giỏ hàng</span>
          </button>

          {/* 2. User Auth Button or Circular Avatar (on far right) */}
          {!isAuthenticated ? (
            <button
              onClick={() => (onOpenAuth ? onOpenAuth() : openAuthModal())}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-700 hover:text-blue-600 bg-slate-100/80 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
              title="Đăng nhập hoặc Đăng ký tài khoản"
            >
              <UserIcon className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Đăng nhập</span>
            </button>
          ) : (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 text-white flex items-center justify-center text-sm font-bold shadow-xs hover:scale-105 hover:ring-2 hover:ring-blue-400/50 transition-all cursor-pointer border border-white/20"
                title={`${user?.name} (${user?.email})`}
                aria-label="Tài khoản người dùng"
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* User info card */}
                  <div className="p-3 pb-2.5 border-b border-slate-100 mb-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{user?.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                      {user?.role === 'admin' ? '⚙️ Quản trị viên' : '👤 Khách hàng'}
                    </span>
                  </div>

                  {/* 1. Thông tin cá nhân */}
                  <Link
                    href="/profile"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <UserIcon className="w-4 h-4 text-slate-500" />
                    <span>Thông tin cá nhân</span>
                  </Link>

                  {/* 2. Đơn hàng của tôi */}
                  <Link
                    href="/orders"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer text-left"
                  >
                    <Package className="w-4 h-4 text-blue-600" />
                    <span>Đơn hàng của tôi</span>
                  </Link>

                  {/* Admin link */}
                  {user?.role === 'admin' && (
                    <Link
                      href="/admin"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer text-left"
                    >
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>Trang Quản trị Admin</span>
                    </Link>
                  )}

                  {/* 3. Đăng xuất */}
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer text-left mt-1 border-t border-slate-100"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Search & Brand Bar */}
      <div className="md:hidden px-4 pb-3 flex items-center gap-2">
        {/* Mobile Brand Dropdown */}
        <div className="relative" ref={mobileBrandRef}>
          <button
            type="button"
            onClick={() => setIsMobileBrandOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border shrink-0 ${
              isMobileBrandOpen
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Hãng</span>
            <ChevronDown className={`w-3 h-3 ${isMobileBrandOpen ? 'rotate-180 text-white' : 'text-slate-400'}`} />
          </button>

          {isMobileBrandOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-3 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-2 gap-1.5">
                {brands.map((b) => (
                  <Link
                    key={b.slug}
                    href={`/brands/${b.slug}`}
                    onClick={() => setIsMobileBrandOpen(false)}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-blue-50 text-xs font-bold text-slate-800"
                  >
                    <span className="w-6 h-6 rounded bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-mono">
                      {b.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="truncate">{b.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Search Form */}
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <input
            type="text"
            value={localSearch}
            onChange={(e) => {
              setLocalSearch(e.target.value);
              if (e.target.value === '') onSearchChange('');
            }}
            placeholder="Tìm kiếm thiết bị công nghệ..."
            className="w-full bg-slate-100 text-sm text-slate-800 placeholder-slate-400 rounded-lg pl-10 pr-9 py-2 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          {localSearch && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>
      </div>
    </header>
  );
};

