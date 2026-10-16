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
import { ChatWidget } from '@/components/ChatWidget';
import { AuthModal } from '@/components/AuthModal';
import { MyOrdersModal } from '@/components/MyOrdersModal';
import { Footer } from '@/components/Footer';
import { useAuthStore } from '@/store/authStore';


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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const openAuthModal = useAuthStore((state) => state.openAuthModal);
  const [isMyOrdersOpen, setIsMyOrdersOpen] = useState(false);

  // Tracking pre-fill
  const [trackingInitialCode, setTrackingInitialCode] = useState<string>('');
  const [trackingInitialPhone, setTrackingInitialPhone] = useState<string>('');

  // Chat pre-fill prompt
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string>('');

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
    setChatInitialPrompt(
      `Tư vấn cho tôi về sản phẩm ${product.name}, cấu hình này phù hợp với nhu cầu nào?`
    );
    setIsChatOpen(true);
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
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenTracking={() => {
          setTrackingInitialCode('');
          setTrackingInitialPhone('');
          setIsTrackingOpen(true);
        }}
        onOpenReview={() => setIsReviewOpen(true)}
        onOpenChat={() => setIsChatOpen((prev) => !prev)}
        onOpenAuth={() => openAuthModal()}
        onOpenMyOrders={() => setIsMyOrdersOpen(true)}
      />


      {/* 2. Hero Section */}
      <Hero
        onExploreClick={handleExploreClick}
        onOpenChat={() => {
          setChatInitialPrompt('Chào BK-Bot! Bạn có thể tư vấn cho tôi một chiếc laptop lập trình tốt không?');
          setIsChatOpen(true);
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
          <div className="space-y-16">
            {/* SECTION 1: 🔥 HOT PICKS & SẢN PHẨM NỔI BẬT */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 mb-2">
                    <Zap className="w-3.5 h-3.5 fill-amber-500" />
                    <span>HOT DEALS & SẢN PHẨM NỔI BẬT</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Thiết Bị Công Nghệ Bán Chạy Nhất
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Những sản phẩm cao cấp được khách hàng đánh giá cao nhất tại BK-Store
                  </p>
                </div>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-2xl border border-slate-200 p-4 h-80 animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {featuredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onAskAI={handleAskAI} />
                  ))}
                </div>
              )}
            </section>

            {/* SECTION 2: 💻 LAPTOP & MÁY TÍNH XÁCH TAY */}
            {laptopProducts.length > 0 && (
              <section className="pt-4 border-t border-slate-200/70">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center shrink-0 shadow-xs">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                        Laptop & Máy Tính Xách Tay
                      </h2>
                      <p className="text-xs text-slate-500">
                        Ultrabook mỏng nhẹ, laptop đồ họa và gaming cấu hình cao
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/categories/laptop"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 px-4 py-2 rounded-xl transition-all self-start sm:self-auto"
                  >
                    <span>Xem tất cả Laptop ({laptopCount})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {laptopProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onAskAI={handleAskAI} />
                  ))}
                </div>
              </section>
            )}

            {/* SECTION 3: 📱 ĐIỆN THOẠI THÔNG MINH */}
            {smartphoneProducts.length > 0 && (
              <section className="pt-4 border-t border-slate-200/70">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center shrink-0 shadow-xs">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                        Điện Thoại Thông Minh Flagship
                      </h2>
                      <p className="text-xs text-slate-500">
                        Apple iPhone, Samsung Galaxy S & Z Series đỉnh cao công nghệ
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/categories/smartphone"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100/80 px-4 py-2 rounded-xl transition-all self-start sm:self-auto"
                  >
                    <span>Xem tất cả Điện thoại ({smartphoneCount})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {smartphoneProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onAskAI={handleAskAI} />
                  ))}
                </div>
              </section>
            )}

            {/* SECTION 4: 🎧 PHỤ KIỆN & NGOẠI VI */}
            {accessoryProducts.length > 0 && (
              <section className="pt-4 border-t border-slate-200/70">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0 shadow-xs">
                      <Headphones className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                        Phụ Kiện & Âm Thanh Cao Cấp
                      </h2>
                      <p className="text-xs text-slate-500">
                        Tai nghe chống ồn, bàn phím cơ Custom và sạc nhanh GaN
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/categories/accessory"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100/80 px-4 py-2 rounded-xl transition-all self-start sm:self-auto"
                  >
                    <span>Xem tất cả Phụ kiện ({accessoryCount})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {accessoryProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onAskAI={handleAskAI} />
                  ))}
                </div>
              </section>
            )}

            {/* SECTION 5: 🏢 ĐỐI TÁC THƯƠNG HIỆU CHÍNH HÃNG */}
            {brands.length > 0 && (
              <section className="pt-4 border-t border-slate-200/70">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                        Thương Hiệu Đối Tác Chính Hãng
                      </h2>
                      <p className="text-xs text-slate-500">
                        Phân phối ủy quyền 100% chính ngạch với chính sách bảo hành toàn quốc
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {brands.map((brand) => (
                    <Link
                      key={brand.id}
                      href={`/brands/${brand.slug}`}
                      className="group bg-white rounded-2xl border border-slate-200/80 p-5 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors">
                            {brand.name}
                          </span>
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            Chính hãng
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                          {brand.description}
                        </p>
                      </div>
                      <div className="flex items-center text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
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
        onClose={() => setIsTrackingOpen(false)}
        initialOrderCode={trackingInitialCode}
        initialPhone={trackingInitialPhone}
        onOpenReviewModal={(code, phone, prodId) => {
          setIsTrackingOpen(false);
          setIsReviewOpen(true);
        }}
      />

      {/* Order Review Modal */}
      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
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
          setIsReviewOpen(true);
        }}
      />

      {/* Floating BK-Bot Chat Widget */}
      <ChatWidget
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen((prev) => !prev)}
        initialPrompt={chatInitialPrompt}
      />
    </div>
  );
}

