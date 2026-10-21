'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Sparkles,
  RotateCcw,
  PackageX,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  Tag,
  SlidersHorizontal,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { FilterBar } from '@/components/FilterBar';
import { ProductCard } from '@/components/ProductCard';
import { CartDrawer } from '@/components/CartDrawer';
import { CheckoutModal } from '@/components/CheckoutModal';
import { OrderTrackingModal } from '@/components/OrderTrackingModal';
import { ReviewModal } from '@/components/ReviewModal';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import { Brand, Category, Order, Product } from '@/types';
import { fetchBrands, fetchCategories, fetchProducts } from '@/lib/api';

const POPULAR_SEARCH_KEYWORDS = [
  'MacBook',
  'iPhone 16',
  'RTX 4060',
  'ASUS ROG',
  'Dell XPS',
  'ThinkPad',
  'Bàn phím cơ',
  'Tai nghe Sony',
  'Sạc Anker',
];

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawQuery = searchParams.get('q') ?? searchParams.get('search') ?? '';
  const currentQuery = rawQuery.trim();

  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedSort, setSelectedSort] = useState<string>('newest');

  // Modals & Drawers
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [trackingInitialCode, setTrackingInitialCode] = useState('');
  const [trackingInitialPhone, setTrackingInitialPhone] = useState('');

  const openAuthModal = useAuthStore((state) => state.openAuthModal);
  const openChat = useChatStore((state) => state.openChat);
  const toggleChat = useChatStore((state) => state.toggleChat);

  // Load initial Categories and Brands
  useEffect(() => {
    async function loadMeta() {
      try {
        const [cats, brs] = await Promise.all([fetchCategories(), fetchBrands()]);
        setCategories(cats);
        setBrands(brs);
      } catch (err) {
        console.error('Lỗi tải danh mục / thương hiệu:', err);
      }
    }
    loadMeta();
  }, []);

  // Compute price range
  const priceRangeFilter = useMemo(() => {
    switch (selectedPriceRange) {
      case 'under-10':
        return { minPrice: 0, maxPrice: 10000000 };
      case '10-25':
        return { minPrice: 10000000, maxPrice: 25000000 };
      case '25-40':
        return { minPrice: 25000000, maxPrice: 40000000 };
      case 'above-40':
        return { minPrice: 40000000, maxPrice: undefined };
      default:
        return { minPrice: undefined, maxPrice: undefined };
    }
  }, [selectedPriceRange]);

  // Load Products based on current query and active filters
  useEffect(() => {
    let ignore = false;
    setIsLoading(true);

    fetchProducts({
      search: currentQuery || undefined,
      category: selectedCategory,
      brand: selectedBrand,
      minPrice: priceRangeFilter.minPrice,
      maxPrice: priceRangeFilter.maxPrice,
      sort: selectedSort,
      limit: 100,
    })
      .then((res) => {
        if (!ignore) {
          setProducts(res.products);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Lỗi tìm kiếm sản phẩm:', err);
        if (!ignore) {
          setProducts([]);
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [currentQuery, selectedCategory, selectedBrand, priceRangeFilter, selectedSort]);

  const brandNames = useMemo(() => brands.map((b) => b.name), [brands]);

  // Has active filter?
  const hasActiveFilters = useMemo(() => {
    return (
      selectedCategory !== 'all' ||
      selectedBrand !== 'all' ||
      selectedPriceRange !== 'all' ||
      selectedSort !== 'newest'
    );
  }, [selectedCategory, selectedBrand, selectedPriceRange, selectedSort]);

  // Reset filters
  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedBrand('all');
    setSelectedPriceRange('all');
    setSelectedSort('newest');
  };

  // Clear query and filters completely
  const handleClearAll = () => {
    handleResetFilters();
    router.push('/search');
  };

  // Quick Ask AI from Product Card
  const handleAskAI = (product: Product) => {
    openChat(
      `Tư vấn cho tôi về sản phẩm ${product.name}, cấu hình này phù hợp với nhu cầu nào và đang có ưu đãi gì?`
    );
  };

  // After order created successfully
  const handleOrderSuccess = (order: Order) => {
    setTrackingInitialCode(order.orderCode);
    setTrackingInitialPhone(order.phone);
    setIsTrackingOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* 1. Global Header */}
      <Header
        searchQuery={currentQuery}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenTracking={() => {
          setTrackingInitialCode('');
          setTrackingInitialPhone('');
          setIsTrackingOpen(true);
        }}
        onOpenReview={() => setIsReviewOpen(true)}
        onOpenChat={toggleChat}
        onOpenAuth={() => openAuthModal()}
      />

      {/* 2. Main Search Page */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:text-blue-600 transition-colors flex items-center gap-1 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Trang chủ</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-900 font-semibold">Tìm kiếm</span>
          {currentQuery && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-blue-600 font-bold truncate max-w-[200px] sm:max-w-md">
                &quot;{currentQuery}&quot;
              </span>
            </>
          )}
        </nav>

        {/* Page Title & Stats Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-200/80 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-blue-600 uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Kết quả tìm kiếm sản phẩm</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {currentQuery ? (
                <>
                  Kết quả cho <span className="text-blue-600">&quot;{currentQuery}&quot;</span>
                </>
              ) : (
                'Tất cả sản phẩm chính hãng'
              )}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-mono bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              Tìm thấy <strong className="text-blue-600 font-bold">{isLoading ? '...' : products.length}</strong> thiết bị
            </span>

            {(hasActiveFilters || currentQuery) && (
              <button
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                title="Xóa tìm kiếm và đặt lại bộ lọc"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại</span>
              </button>
            )}
          </div>
        </div>

        

        {/* Filter Bar Component */}
        <FilterBar
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          selectedPriceRange={selectedPriceRange}
          onSelectPriceRange={setSelectedPriceRange}
          selectedBrand={selectedBrand}
          onSelectBrand={setSelectedBrand}
          selectedSort={selectedSort}
          onSelectSort={setSelectedSort}
          brands={brandNames}
        />

        {/* Product Grid / Loading / Empty State */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 py-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="bg-white rounded-3xl border border-slate-200/80 p-4 animate-pulse flex flex-col h-80"
              >
                <div className="w-full h-44 bg-slate-100 rounded-2xl mb-4" />
                <div className="h-4 bg-slate-100 rounded-full w-3/4 mb-2" />
                <div className="h-3 bg-slate-100 rounded-full w-1/2 mb-4" />
                <div className="mt-auto h-6 bg-slate-100 rounded-full w-2/3" />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 py-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} onAskAI={handleAskAI} />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-12 text-center my-6 shadow-xs max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
              <PackageX className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Không tìm thấy sản phẩm nào
            </h3>
            <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
              {currentQuery ? (
                <>
                  Không có thiết bị nào khớp với từ khóa &quot;<strong>{currentQuery}</strong>&quot;
                  {hasActiveFilters ? ' và các bộ lọc đang chọn.' : '.'}
                </>
              ) : (
                'Không có sản phẩm nào phù hợp với bộ lọc đã chọn.'
              )}
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 text-xs text-slate-600 text-left mb-6 max-w-md mx-auto border border-slate-100">
              <p className="font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Gợi ý tìm kiếm:</span>
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-500">
                <li>Kiểm tra lại lỗi chính tả của từ khóa.</li>
                <li>Thử tìm kiếm với các từ khóa ngắn hơn (ví dụ: &quot;MacBook&quot;, &quot;Laptop&quot;).</li>
                <li>Xóa bớt bộ lọc khoảng giá hoặc hãng sản xuất.</li>
              </ul>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Xóa bộ lọc
                </button>
              )}
              <button
                onClick={handleClearAll}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
              >
                Xem tất cả sản phẩm
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 3. Footer */}
      <Footer />

      {/* Modals & Drawers */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderSuccess={handleOrderSuccess}
      />

      <OrderTrackingModal
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
        initialOrderCode={trackingInitialCode}
        initialPhone={trackingInitialPhone}
      />

      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        initialOrderCode=""
        initialPhone=""
      />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center animate-bounce mb-3">
            <Search className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-600">Đang chuẩn bị trang tìm kiếm BK-Store...</p>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
