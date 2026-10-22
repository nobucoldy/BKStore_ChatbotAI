'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Hero } from '@/components/Hero';
import { FilterBar } from '@/components/FilterBar';
import { ProductCard } from '@/components/ProductCard';
import { CartDrawer } from '@/components/CartDrawer';
import { CheckoutModal } from '@/components/CheckoutModal';
import { OrderTrackingModal } from '@/components/OrderTrackingModal';
import { ReviewModal } from '@/components/ReviewModal';
import { AuthModal } from '@/components/AuthModal';
import { MyOrdersModal } from '@/components/MyOrdersModal';
import { Footer } from '@/components/Footer';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';


import { Brand, Category, Order, Product } from '@/types';
import { fetchBrands, fetchCategories, fetchProducts } from '@/lib/api';
import {
  PackageX,
  Sparkles,
  Laptop,
  Smartphone,
  Headphones,
  ArrowRight,
  Zap,
  Store,
  RotateCcw,
} from 'lucide-react';

export default function HomePage() {
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
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Drawers state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const openAuthModal = useAuthStore((state) => state.openAuthModal);
  const openChat = useChatStore((state) => state.openChat);
  const toggleChat = useChatStore((state) => state.toggleChat);
  const [isMyOrdersOpen, setIsMyOrdersOpen] = useState(false);

  // Tracking pre-fill
  const [trackingInitialCode, setTrackingInitialCode] = useState<string>('');
  const [trackingInitialPhone, setTrackingInitialPhone] = useState<string>('');

  // Review pre-fill
  const [reviewInitialCode, setReviewInitialCode] = useState<string>('');
  const [reviewInitialPhone, setReviewInitialPhone] = useState<string>('');
  const [reviewInitialProductId, setReviewInitialProductId] = useState<string>('');

  // Initialize auth
  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

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

  // Compute price range numbers
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

  // Is user actively searching or filtering?
  const isFiltering = useMemo(() => {
    return Boolean(
      searchQuery.trim() ||
        selectedCategory !== 'all' ||
        selectedBrand !== 'all' ||
        selectedPriceRange !== 'all' ||
        selectedSort !== 'newest'
    );
  }, [searchQuery, selectedCategory, selectedBrand, selectedPriceRange, selectedSort]);

  // Load Products when filters change
  useEffect(() => {
    let ignore = false;
    setIsLoading(true);

    fetchProducts({
      category: selectedCategory,
      brand: selectedBrand,
      minPrice: priceRangeFilter.minPrice,
      maxPrice: priceRangeFilter.maxPrice,
      search: searchQuery,
      sort: selectedSort,
      limit: 50,
    })
      .then((res) => {
        if (!ignore) {
          setProducts(res.products);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error loading products:', err);
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [selectedCategory, selectedBrand, priceRangeFilter, searchQuery, selectedSort]);

  // Curated product slices for the Home Page sections
  const featuredProducts = useMemo(() => {
    const discounted = products.filter((p) => p.originalPrice && p.originalPrice > p.price);
    return discounted.length >= 4 ? discounted.slice(0, 4) : products.slice(0, 4);
  }, [products]);

  const laptopProducts = useMemo(() => {
    return products.filter((p) => p.categorySlug === 'laptop').slice(0, 4);
  }, [products]);

  const smartphoneProducts = useMemo(() => {
    return products.filter((p) => p.categorySlug === 'smartphone').slice(0, 4);
  }, [products]);

  const accessoryProducts = useMemo(() => {
    return products.filter((p) => p.categorySlug === 'accessory').slice(0, 4);
  }, [products]);

  const laptopCount = useMemo(() => {
    return products.filter((p) => p.categorySlug === 'laptop').length;
  }, [products]);

  const smartphoneCount = useMemo(() => {
    return products.filter((p) => p.categorySlug === 'smartphone').length;
  }, [products]);

  const accessoryCount = useMemo(() => {
    return products.filter((p) => p.categorySlug === 'accessory').length;
  }, [products]);

  // Extract distinct brand list for filter options
  const availableBrands = useMemo(() => {
    const brandSet = new Set<string>();
    products.forEach((p) => {
      if (p.brand) brandSet.add(p.brand);
    });
    ['Apple', 'Dell', 'Asus', 'Samsung', 'Sony', 'Keychron', 'Anker'].forEach((b) =>
      brandSet.add(b)
    );
    return Array.from(brandSet).sort();
  }, [products]);

  // Scroll smoothly to catalog section
  const handleExploreClick = () => {
    const catalogEl = document.getElementById('catalog-section');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Reset all filters back to curated home view
  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedBrand('all');
    setSelectedPriceRange('all');
    setSelectedSort('newest');
    setSearchQuery('');
  };

  // Quick Ask AI from Product Card
  const handleAskAI = (product: Product) => {
    openChat(
      `Tư vấn cho tôi về sản phẩm ${product.name}, cấu hình này phù hợp với nhu cầu nào?`
    );
  };

  // After order created successfully, can open tracking directly
  const handleOrderSuccess = (order: Order) => {
    setTrackingInitialCode(order.orderCode);
    setTrackingInitialPhone(order.phone);
    setIsTrackingOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* 1. Sticky Header */}
      <Header
        onOpenCart={() => setIsCartOpen(true)}
        onOpenTracking={() => {
          setTrackingInitialCode('');
          setTrackingInitialPhone('');
          setIsTrackingOpen(true);
        }}
        onOpenReview={() => setIsReviewOpen(true)}
        onOpenChat={toggleChat}
        onOpenAuth={() => openAuthModal()}
        onOpenMyOrders={() => setIsMyOrdersOpen(true)}
      />


      {/* 2. Hero Section */}
      <Hero
        onExploreClick={handleExploreClick}
        onOpenChat={() => {
          openChat('Chào BK-Bot! Bạn có thể tư vấn cho tôi một chiếc laptop tốt được không?');
        }}
      />

      {/* 3. Main Catalog Section */}
      <main id="catalog-section" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* IF USER IS ACTIVE FILTERING / SEARCHING -> SHOW FILTER RESULTS VIEW */}
        {isFiltering ? (
          <div>
            {/* Active Search & Filter Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-200 gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-blue-600 uppercase tracking-wider mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Bộ lọc & Kết quả tìm kiếm</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {searchQuery.trim()
                    ? `Kết quả tìm kiếm cho: "${searchQuery}"`
                    : selectedCategory !== 'all'
                    ? categories.find((c) => c.slug === selectedCategory)?.name || 'Danh mục sản phẩm'
                    : selectedBrand !== 'all'
                    ? `Sản phẩm thương hiệu ${selectedBrand}`
                    : 'Kết quả lọc sản phẩm'}
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-mono">
                  Tìm thấy <strong>{products.length}</strong> thiết bị
                </span>
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Về trang chủ</span>
                </button>
              </div>
            </div>

            {/* Filter Bar */}
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
              brands={availableBrands}
            />

            {/* Product Grid / Skeleton / Empty */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
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
            ) : products.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-dashed border-slate-300 p-8 mt-6">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                  <PackageX className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Không tìm thấy sản phẩm phù hợp</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md">
                  Không có thiết bị nào khớp với tiêu chí tìm kiếm hoặc bộ lọc hiện tại. Thử xóa bớt bộ lọc hoặc gõ từ khóa khác.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="mt-5 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                >
                  Đặt lại tất cả bộ lọc
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} onAskAI={handleAskAI} />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* CURATED SECTIONS VIEW (ĐỀ XUẤT 1) */
          <div className="space-y-12">
            {/* SECTION 1: 🔥 HOT PICKS & SẢN PHẨM NỔI BẬT */}
            <section className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-amber-500/10 via-amber-50/40 to-white border-2 border-amber-300/80 shadow-xl shadow-amber-500/5 overflow-hidden">
              {/* Decorative top-right glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/15 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/4"></div>

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3 pb-5 border-b border-amber-200/70">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-500 text-white shadow-sm mb-2.5">
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span>HOT DEALS </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Thiết Bị Công Nghệ Bán Chạy Nhất
                  </h2>
                </div>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-2xl border-2 border-amber-200 p-4 h-80 animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {featuredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onAskAI={handleAskAI} themeColor="amber" />
                  ))}
                </div>
              )}
            </section>

            {/* SECTION 2: 💻 LAPTOP & MÁY TÍNH XÁCH TAY */}
            {laptopProducts.length > 0 && (
              <section className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-blue-500/10 via-blue-50/40 to-white border-2 border-blue-200/90 shadow-xl shadow-blue-500/5 overflow-hidden">
                {/* Decorative top-right glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/15 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/4"></div>

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3 pb-5 border-b border-blue-200/70">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-600/30">
                      <Laptop className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                        Laptop và máy tính 
                      </h2>
                    </div>
                  </div>

                  <Link
                    href="/categories/laptop"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-600/20 self-start sm:self-auto cursor-pointer"
                  >
                    <span>Xem tất cả</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {laptopProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onAskAI={handleAskAI} themeColor="blue" />
                  ))}
                </div>
              </section>
            )}

            {/* SECTION 3: 📱 ĐIỆN THOẠI THÔNG MINH */}
            {smartphoneProducts.length > 0 && (
              <section className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-indigo-500/10 via-indigo-50/40 to-white border-2 border-indigo-200/90 shadow-xl shadow-indigo-500/5 overflow-hidden">
                {/* Decorative top-right glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-400/15 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/4"></div>

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3 pb-5 border-b border-indigo-200/70">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/30">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                        Điện Thoại Thông Minh, Tablet
                      </h2>
                    </div>
                  </div>

                  <Link
                    href="/categories/smartphone"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/20 self-start sm:self-auto cursor-pointer"
                  >
                    <span>Xem tất cả</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {smartphoneProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onAskAI={handleAskAI} themeColor="indigo" />
                  ))}
                </div>
              </section>
            )}

            {/* SECTION 4: 🎧 PHỤ KIỆN & NGOẠI VI */}
            {accessoryProducts.length > 0 && (
              <section className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-emerald-500/10 via-emerald-50/40 to-white border-2 border-emerald-200/90 shadow-xl shadow-emerald-500/5 overflow-hidden">
                {/* Decorative top-right glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/4"></div>

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3 pb-5 border-b border-emerald-200/70">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/30">
                      <Headphones className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                        Phụ Kiện và ngoại vi
                      </h2>
                    </div>
                  </div>

                  <Link
                    href="/categories/accessory"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/20 self-start sm:self-auto cursor-pointer"
                  >
                    <span>Xem tất cả</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {accessoryProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onAskAI={handleAskAI} themeColor="emerald" />
                  ))}
                </div>
              </section>
            )}

            {/* SECTION 5: 🏢 ĐỐI TÁC THƯƠNG HIỆU CHÍNH HÃNG */}
            {brands.length > 0 && (
              <section className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-slate-100/90 via-slate-50/50 to-white border-2 border-slate-200/90 shadow-xl shadow-slate-500/5 overflow-hidden">
                <div className="relative z-10 flex items-center justify-between mb-6 pb-5 border-b border-slate-200/70">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-md shadow-slate-900/20">
                      <Store className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                        Thương Hiệu Đối Tác Chính Hãng
                      </h2>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {brands.map((brand) => (
                    <Link
                      key={brand.id}
                      href={`/brands/${brand.slug}`}
                      className="group bg-white rounded-2xl border-2 border-slate-200/80 p-5 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between cursor-pointer"
                    >
                      <div>
                        {/* Logo & Brand Name side-by-side (Chính hãng badge removed) */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-10 w-14 px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-center shrink-0 group-hover:bg-blue-50/50 group-hover:border-blue-200 transition-colors">
                            <img
                              src={brand.logo || `/brands/${brand.slug.toLowerCase()}.svg`}
                              alt={`${brand.name} logo`}
                              className="h-5 w-auto max-w-[48px] object-contain group-hover:scale-105 transition-transform"
                            />
                          </div>

                          <h3 className="font-extrabold text-base sm:text-lg text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                            {brand.name}
                          </h3>
                        </div>

                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                          {brand.description}
                        </p>
                      </div>

                      <div className="flex items-center text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition-transform pt-3 border-t border-slate-100">
                        <span>Khám phá sản phẩm</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* 4. Footer */}
      <Footer
        onOpenTracking={() => {
          setTrackingInitialCode('');
          setTrackingInitialPhone('');
          setIsTrackingOpen(true);
        }}
        onOpenReview={() => setIsReviewOpen(true)}
      />

      {/* 5. Modals & Slide-overs */}
      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onProceedToCheckout={() => setIsCheckoutOpen(true)}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        key={`checkout-${isCheckoutOpen ? 'open' : 'closed'}`}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderSuccess={handleOrderSuccess}
        onRequireLogin={() => {
          openAuthModal('Vui lòng đăng nhập tài khoản để tiến hành đặt hàng.');
        }}
      />

      {/* Order Tracking Modal */}
      <OrderTrackingModal
        key={`${trackingInitialCode}-${trackingInitialPhone}-${isTrackingOpen ? 'open' : 'closed'}`}
        isOpen={isTrackingOpen}
        onClose={() => {
          setIsTrackingOpen(false);
          setTrackingInitialCode('');
          setTrackingInitialPhone('');
        }}
        initialOrderCode={trackingInitialCode}
        initialPhone={trackingInitialPhone}
        onOpenReviewModal={(code, phone, prodId) => {
          setIsTrackingOpen(false);
          setReviewInitialCode(code);
          setReviewInitialPhone(phone);
          if (prodId) setReviewInitialProductId(prodId);
          setIsReviewOpen(true);
        }}
      />

      {/* Order Review Modal */}
      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => {
          setIsReviewOpen(false);
          setReviewInitialCode('');
          setReviewInitialPhone('');
          setReviewInitialProductId('');
        }}
        initialOrderCode={reviewInitialCode}
        initialPhone={reviewInitialPhone}
        initialProductId={reviewInitialProductId}
      />

      {/* My Orders Modal (User Order History) */}
      <MyOrdersModal
        isOpen={isMyOrdersOpen}
        onClose={() => setIsMyOrdersOpen(false)}
        onOpenTracking={(code, phone) => {
          setTrackingInitialCode(code);
          setTrackingInitialPhone(phone);
          setIsTrackingOpen(true);
        }}
        onOpenReview={(code, phone) => {
          setReviewInitialCode(code || '');
          setReviewInitialPhone(phone || '');
          setIsReviewOpen(true);
        }}
      />
    </div>
  );
}

