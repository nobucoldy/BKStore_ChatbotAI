'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  PackageX,
  Filter,
  ArrowUpDown,
  Search,
  X,
} from 'lucide-react';
import { fetchProducts } from '@/lib/api';
import { Product } from '@/types';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { CartDrawer } from '@/components/CartDrawer';
import { CheckoutModal } from '@/components/CheckoutModal';
import { OrderTrackingModal } from '@/components/OrderTrackingModal';
import { useChatStore } from '@/store/chatStore';

const BRAND_NAME_MAP: Record<string, string> = {
  apple: 'Apple',
  dell: 'Dell',
  asus: 'ASUS',
  samsung: 'Samsung',
  sony: 'Sony',
  keychron: 'Keychron',
  anker: 'Anker',
};

export default function BrandDetailPage() {
  const params = useParams();
  const rawBrand = params?.brand ? decodeURIComponent(params.brand as string) : '';
  const brandSlug = rawBrand.toLowerCase().trim();

  // Brand Display Name
  const brandDisplayName = useMemo(() => {
    if (BRAND_NAME_MAP[brandSlug]) {
      return BRAND_NAME_MAP[brandSlug];
    }
    return rawBrand ? rawBrand.charAt(0).toUpperCase() + rawBrand.slice(1) : 'Thương hiệu';
  }, [brandSlug, rawBrand]);

  // Data & Filter State
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('all');
  const [selectedSort, setSelectedSort] = useState<string>('newest');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Drawers state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [trackingInitialCode, setTrackingInitialCode] = useState('');
  const [trackingInitialPhone, setTrackingInitialPhone] = useState('');
  const openChat = useChatStore((state) => state.openChat);
  const toggleChat = useChatStore((state) => state.toggleChat);

  // Load products for this brand
  useEffect(() => {
    if (!brandSlug) return;
    let ignore = false;
    setIsLoading(true);

    fetchProducts({
      brand: brandSlug,
      limit: 50,
    })
      .then((res) => {
        if (!ignore) {
          setProducts(res.products);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching brand products:', err);
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [brandSlug]);

  // Client-side filtering
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Category filter
    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.categorySlug?.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Price range filter
    if (selectedPriceRange === 'under-10') {
      list = list.filter((p) => p.price < 10000000);
    } else if (selectedPriceRange === '10-25') {
      list = list.filter((p) => p.price >= 10000000 && p.price <= 25000000);
    } else if (selectedPriceRange === '25-40') {
      list = list.filter((p) => p.price >= 25000000 && p.price <= 40000000);
    } else if (selectedPriceRange === 'above-40') {
      list = list.filter((p) => p.price > 40000000);
    }

    // Local Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          JSON.stringify(p.specs || {}).toLowerCase().includes(q)
      );
    }

    // Sorting
    if (selectedSort === 'price_asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (selectedSort === 'price_desc') {
      list.sort((a, b) => b.price - a.price);
    }

    return list;
  }, [products, selectedCategory, selectedPriceRange, searchQuery, selectedSort]);

  // Categories available within this brand
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.categorySlug) set.add(p.categorySlug);
    });
    return Array.from(set);
  }, [products]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* 1. Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenTracking={() => setIsTrackingOpen(true)}
        onOpenChat={toggleChat}
      />

      {/* 2. Main Brand Products Catalog */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:text-blue-600 transition-colors flex items-center gap-1 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại trang chủ</span>
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-bold">{brandDisplayName}</span>
        </div>

        {/* Filter and Control Bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs mb-8 flex flex-col gap-4">
          {/* Category Tabs inside this Brand */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              Tất cả ({products.length})
            </button>
            {availableCategories.map((cat) => {
              const count = products.filter((p) => p.categorySlug === cat).length;
              const label =
                cat === 'laptop'
                  ? 'Laptop & Máy tính'
                  : cat === 'smartphone'
                  ? 'Điện thoại'
                  : cat === 'accessory'
                  ? 'Phụ kiện'
                  : cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>

          {/* Price Range & Sort Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Price Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500 font-medium">Mức giá:</span>
                <select
                  value={selectedPriceRange}
                  onChange={(e) => setSelectedPriceRange(e.target.value)}
                  className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="all">Tất cả khoảng giá</option>
                  <option value="under-10">Dưới 10 triệu</option>
                  <option value="10-25">10 - 25 triệu</option>
                  <option value="25-40">25 - 40 triệu</option>
                  <option value="above-40">Trên 40 triệu</option>
                </select>
              </div>

              {/* In-brand Search Input */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Tìm trong ${brandDisplayName}...`}
                  className="bg-slate-50 border border-slate-200/80 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500 transition-all w-52 sm:w-60"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl ml-auto">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500 font-medium">Sắp xếp:</span>
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer"
              >
                <option value="newest">Mới nhất</option>
                <option value="price_asc">Giá: Thấp đến Cao</option>
                <option value="price_desc">Giá: Cao đến Thấp</option>
              </select>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-4 animate-pulse"
              >
                <div className="aspect-4/3 bg-slate-200 rounded-xl"></div>
                <div className="h-4 bg-slate-200 rounded-md w-3/4"></div>
                <div className="h-3 bg-slate-200 rounded-md w-1/2"></div>
                <div className="h-6 bg-slate-200 rounded-md w-1/3 mt-auto"></div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-dashed border-slate-300 p-8">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
              <PackageX className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Không tìm thấy sản phẩm phù hợp</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Không có sản phẩm {brandDisplayName} nào khớp với bộ lọc hoặc từ khóa tìm kiếm của bạn.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedPriceRange('all');
                setSearchQuery('');
              }}
              className="mt-5 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              Đặt lại bộ lọc {brandDisplayName}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAskAI={(p) => {
                  openChat(
                    `Tư vấn cho tôi về sản phẩm ${p.name}, cấu hình này phù hợp với nhu cầu nào?`
                  );
                }}
              />
            ))}
          </div>
        )}
      </main>

      {/* 3. Footer */}
      <Footer onOpenTracking={() => setIsTrackingOpen(true)} />

      {/* 4. Drawers and Modals */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onProceedToCheckout={() => setIsCheckoutOpen(true)}
      />

      <CheckoutModal
        key={`checkout-${isCheckoutOpen ? 'open' : 'closed'}`}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderSuccess={(order) => {
          setTrackingInitialCode(order.orderCode);
          setTrackingInitialPhone(order.phone);
          setIsCheckoutOpen(false);
          setIsTrackingOpen(true);
        }}
      />

      <OrderTrackingModal
        key={`tracking-${trackingInitialCode}-${trackingInitialPhone}-${isTrackingOpen ? 'open' : 'closed'}`}
        isOpen={isTrackingOpen}
        onClose={() => {
          setIsTrackingOpen(false);
          setTrackingInitialCode('');
          setTrackingInitialPhone('');
        }}
        initialOrderCode={trackingInitialCode}
        initialPhone={trackingInitialPhone}
      />
    </div>
  );
}
