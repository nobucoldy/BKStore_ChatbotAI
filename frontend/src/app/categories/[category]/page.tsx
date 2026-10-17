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
import { ChatWidget } from '@/components/ChatWidget';

const CATEGORY_NAME_MAP: Record<string, string> = {
  laptop: 'Laptop & Máy tính xách tay',
  smartphone: 'Điện thoại thông minh',
  accessory: 'Phụ kiện & Ngoại vi',
};

export default function CategoryDetailPage() {
  const params = useParams();
  const rawCategory = params?.category ? decodeURIComponent(params.category as string) : '';
  const categorySlug = rawCategory.toLowerCase().trim();

  // Category Title
  const categoryTitle = useMemo(() => {
    if (CATEGORY_NAME_MAP[categorySlug]) {
      return CATEGORY_NAME_MAP[categorySlug];
    }
    return rawCategory
      ? rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1)
      : 'Danh mục sản phẩm';
  }, [categorySlug, rawCategory]);

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter State
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('all');
  const [selectedSort, setSelectedSort] = useState<string>('newest');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Drawers state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [trackingInitialCode, setTrackingInitialCode] = useState('');
  const [trackingInitialPhone, setTrackingInitialPhone] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string>('');

  // Load products for this category
  useEffect(() => {
    if (!categorySlug) return;
    let ignore = false;
    setIsLoading(true);

    fetchProducts({
      category: categorySlug,
      limit: 50,
    })
      .then((res) => {
        if (!ignore) {
          setProducts(res.products);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Lỗi khi tải sản phẩm theo danh mục:', err);
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [categorySlug]);

  // Extract distinct brand list available within this category
  const availableBrands = useMemo(() => {
    const brandSet = new Set<string>();
    products.forEach((p) => {
      if (p.brand) brandSet.add(p.brand);
    });
    return Array.from(brandSet).sort();
  }, [products]);

  // Client-side filtering
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Filter by Brand
    if (selectedBrand !== 'all') {
      list = list.filter((p) => p.brand?.toLowerCase() === selectedBrand.toLowerCase());
    }

    // Filter by Price range
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
  }, [products, selectedBrand, selectedPriceRange, searchQuery, selectedSort]);

  // Quick Ask AI from Product Card
  const handleAskAI = (product: Product) => {
    setChatInitialPrompt(
      `Tư vấn cho tôi về ${product.name}, sản phẩm này có điểm gì nổi bật và phù hợp với nhu cầu nào?`
    );
    setIsChatOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* 1. Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenTracking={() => setIsTrackingOpen(true)}
        onOpenChat={() => setIsChatOpen((prev) => !prev)}
      />

      {/* 2. Main Category Page */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link
            href="/"
            className="hover:text-blue-600 transition-colors flex items-center gap-1 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại trang chủ</span>
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-bold">{categoryTitle}</span>
        </div>

        {/* Filter and Control Bar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs mb-8 flex flex-col gap-4">
          {/* Brand Tabs for this Category */}
          {availableBrands.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 scrollbar-none">
              <span className="text-xs font-semibold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                Thương hiệu:
              </span>
              <button
                onClick={() => setSelectedBrand('all')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedBrand === 'all'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                Tất cả hãng ({products.length})
              </button>
              {availableBrands.map((brandName) => {
                const count = products.filter(
                  (p) => p.brand?.toLowerCase() === brandName.toLowerCase()
                ).length;
                return (
                  <button
                    key={brandName}
                    onClick={() => setSelectedBrand(brandName)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedBrand === brandName
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {brandName} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Secondary Controls: Price, Search, Sort */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            {/* Price Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: 'all', label: 'Mọi mức giá' },
                { id: 'under-10', label: '< 10 Triệu' },
                { id: '10-25', label: '10 - 25 Triệu' },
                { id: '25-40', label: '25 - 40 Triệu' },
                { id: 'above-40', label: '> 40 Triệu' },
              ].map((range) => (
                <button
                  key={range.id}
                  onClick={() => setSelectedPriceRange(range.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedPriceRange === range.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100/80 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>

            {/* Search within Category & Sort Dropdown */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Lọc tên, cấu hình..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Sort Selector */}
              <div className="relative">
                <select
                  value={selectedSort}
                  onChange={(e) => setSelectedSort(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 cursor-pointer focus:outline-hidden focus:border-blue-500"
                >
                  <option value="newest">Mới nhất</option>
                  <option value="price_asc">Giá tăng dần</option>
                  <option value="price_desc">Giá giảm dần</option>
                </select>
                <ArrowUpDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Results Counter / Reset */}
        <div className="flex items-center justify-between mb-4 text-xs text-slate-500">
          <span>
            Hiển thị <strong>{filteredProducts.length}</strong> / {products.length} sản phẩm
          </span>
          {(selectedBrand !== 'all' || selectedPriceRange !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedBrand('all');
                setSelectedPriceRange('all');
                setSearchQuery('');
              }}
              className="text-blue-600 hover:underline font-semibold flex items-center gap-1"
            >
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>

        {/* 3. Product Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
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
              Không có thiết bị {categoryTitle.toLowerCase()} nào khớp với bộ lọc bạn chọn. Thử
              đổi hãng hoặc mức giá khác.
            </p>
            <button
              onClick={() => {
                setSelectedBrand('all');
                setSelectedPriceRange('all');
                setSearchQuery('');
              }}
              className="mt-5 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} onAskAI={handleAskAI} />
            ))}
          </div>
        )}
      </main>

      {/* 4. Footer */}
      <Footer
        onOpenTracking={() => {
          setIsTrackingOpen(true);
        }}
      />

      {/* 5. Modals & Drawers */}
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

      <ChatWidget
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen((prev) => !prev)}
        initialPrompt={chatInitialPrompt}
      />
    </div>
  );
}
