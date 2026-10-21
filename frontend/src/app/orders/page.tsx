'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Package,
  Calendar,
  Building2,
  Clock,
  CheckCircle2,
  Truck,
  RotateCcw,
  Star,
  ExternalLink,
  ShoppingBag,
  ArrowLeft,
  Lock,
  Search,
  Filter,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AuthModal } from '@/components/AuthModal';
import { OrderTrackingModal } from '@/components/OrderTrackingModal';
import { ReviewModal } from '@/components/ReviewModal';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { fetchMyOrdersApi } from '@/lib/api';
import { Order } from '@/types';
import { formatPrice } from '@/lib/utils';

export default function MyOrdersPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const { addItem } = useCartStore();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [reviewOrderCode, setReviewOrderCode] = useState('');
  const [reviewPhone, setReviewPhone] = useState('');
  const [reviewProdId, setReviewProdId] = useState('');
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchMyOrdersApi();
      if (res.success && Array.isArray(res.data)) {
        setOrders(res.data);
      } else {
        setOrders([]);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tải lịch sử đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadOrders();
    }
  }, [isAuthenticated]);

  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      // Status filter
      if (selectedStatus !== 'all' && ord.status !== selectedStatus) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const codeMatch = ord.orderCode.toLowerCase().includes(query);
        const nameMatch = ord.customerName.toLowerCase().includes(query);
        const itemMatch = ord.items?.some((i) =>
          i.productName?.toLowerCase().includes(query)
        );
        return codeMatch || nameMatch || itemMatch;
      }
      return true;
    });
  }, [orders, selectedStatus, searchQuery]);

  const statusCounts = useMemo(() => {
    return {
      all: orders.length,
      pending: orders.filter((o) => o.status === 'pending').length,
      confirmed: orders.filter((o) => o.status === 'confirmed').length,
      shipping: orders.filter((o) => o.status === 'shipping').length,
      delivered: orders.filter((o) => o.status === 'delivered').length,
      cancelled: orders.filter((o) => o.status === 'cancelled').length,
    };
  }, [orders]);

  const handleOpenReview = (orderCode: string, phone: string, prodId?: string) => {
    setReviewOrderCode(orderCode);
    setReviewPhone(phone);
    setReviewProdId(prodId || '');
    setIsReviewOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Giao thành công</span>
          </span>
        );
      case 'shipping':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Truck className="w-3.5 h-3.5" />
            <span>Đang vận chuyển</span>
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Package className="w-3.5 h-3.5 text-indigo-600" />
            <span>Đã xác nhận</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            <span>Chờ xác nhận</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            <span>Đã hủy</span>
          </span>
        );
      default:
        const labelMap: Record<string, string> = {
          pending: 'Chờ xác nhận',
          confirmed: 'Đã xác nhận',
          shipping: 'Đang vận chuyển',
          delivered: 'Giao thành công',
          cancelled: 'Đã hủy',
        };
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {labelMap[status] || status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* 1. Header */}
      <Header
        searchQuery=""
        onSearchChange={() => {}}
        onOpenCart={() => router.push('/#catalog-section')}
        onOpenTracking={() => {}}
        onOpenReview={() => setIsReviewOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* 2. Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Về trang chủ BK-Store</span>
          </Link>
          <button
            onClick={loadOrders}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Làm mới dữ liệu</span>
          </button>
        </div>

        {/* Page Title & Stats Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-200/80 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-blue-600 uppercase tracking-wider mb-1">
              <Package className="w-3.5 h-3.5" />
              <span>Quản lý đơn hàng cá nhân</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Đơn hàng của tôi
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Xem chi tiết tiến trình vận đơn, chi nhánh xuất kho và đánh giá sản phẩm sau khi nhận máy.
            </p>
          </div>

          {isAuthenticated && (
            <div className="flex items-center gap-3">
              <div className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  {orders.length}
                </div>
                <div>
                  <div className="text-[11px] text-slate-400 font-medium">Tổng đơn hàng</div>
                  <div className="text-xs font-bold text-slate-800">
                    {orders.length} giao dịch
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Not authenticated gate */}
        {!isLoading && !isAuthenticated ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8 sm:p-14 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Vui lòng đăng nhập</h2>
            <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
              Bạn cần đăng nhập tài khoản BK-Store để xem danh sách đơn hàng đã mua, theo dõi lộ trình vận chuyển và gửi đánh giá sản phẩm.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsAuthOpen(true)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                Đăng nhập ngay
              </button>
              <Link
                href="/"
                className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors"
              >
                Về trang chủ
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-2xs">
              {/* Status Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {[
                  { key: 'all', label: 'Tất cả', count: statusCounts.all },
                  { key: 'pending', label: 'Chờ xác nhận', count: statusCounts.pending },
                  { key: 'confirmed', label: 'Đã xác nhận', count: statusCounts.confirmed },
                  { key: 'shipping', label: 'Đang vận chuyển', count: statusCounts.shipping },
                  { key: 'delivered', label: 'Giao thành công', count: statusCounts.delivered },
                  { key: 'cancelled', label: 'Đã hủy', count: statusCounts.cancelled },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedStatus(tab.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedStatus === tab.key
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        selectedStatus === tab.key
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search Order Input */}
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm mã đơn hoặc sản phẩm..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Error notification */}
            {error && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Loading state skeleton */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="p-6 rounded-3xl bg-white border border-slate-200 animate-pulse space-y-4"
                  >
                    <div className="h-5 bg-slate-200 rounded w-1/3" />
                    <div className="h-16 bg-slate-100 rounded-xl" />
                    <div className="h-8 bg-slate-200 rounded w-1/4" />
                  </div>
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              /* Empty Orders State */
              <div className="py-16 px-4 bg-white rounded-3xl border border-dashed border-slate-200 text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                  <Package className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">
                  {selectedStatus !== 'all' || searchQuery
                    ? 'Không tìm thấy đơn hàng phù hợp'
                    : 'Bạn chưa có đơn hàng nào'}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mb-5">
                  {selectedStatus !== 'all' || searchQuery
                    ? 'Hãy thử thay đổi tab trạng thái hoặc từ khóa tìm kiếm.'
                    : 'Hãy khám phá danh mục MacBook, iPhone, bàn phím cơ và thiết bị công nghệ chính hãng tại BK-Store!'}
                </p>
                <Link
                  href="/"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all"
                >
                  Khám phá sản phẩm ngay
                </Link>
              </div>
            ) : (
              /* Orders List */
              <div className="space-y-4">
                {filteredOrders.map((ord) => (
                  <div
                    key={ord.id || ord.orderCode}
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all p-5 sm:p-6 overflow-hidden flex flex-col gap-4"
                  >
                    {/* Top Row: Code, Date, Branch, Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-base font-mono font-extrabold text-blue-900 tracking-tight">
                          {ord.orderCode}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {ord.createdAt
                              ? new Date(ord.createdAt).toLocaleString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })
                              : 'Vừa xong'}
                          </span>
                        </div>
                        {ord.branchName && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[200px]">{ord.branchName}</span>
                          </div>
                        )}
                      </div>

                      <div>{getStatusBadge(ord.status)}</div>
                    </div>

                    {/* Middle Row: Items List */}
                    <div className="space-y-3">
                      {ord.items?.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-100"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {item.productSlug ? (
                              <Link
                                href={`/products/${item.productSlug}`}
                                className="font-bold text-xs text-slate-800 hover:text-blue-600 transition-colors line-clamp-1"
                              >
                                {item.productName}
                              </Link>
                            ) : (
                              <span className="font-bold text-xs text-slate-800 line-clamp-1">
                                {item.productName}
                              </span>
                            )}
                            <span className="text-xs text-slate-400 shrink-0 font-mono">
                              x{item.quantity}
                            </span>
                          </div>

                          <div className="text-xs font-mono font-bold text-slate-900 shrink-0 ml-3">
                            {formatPrice(
                              Number(item.unitPrice || item.price || 0) * item.quantity
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Shipping Tracking Timeline info */}
                    {ord.trackingInfo && (
                      <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-100/80 text-xs text-slate-700 leading-relaxed flex items-start gap-2">
                        <Truck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-blue-900">Lộ trình vận chuyển:</strong>{' '}
                          <span>{ord.trackingInfo}</span>
                        </div>
                      </div>
                    )}

                    {/* Delivery Address & Bottom Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3.5 border-t border-slate-100 gap-3 text-xs">
                      <div className="text-slate-500">
                        <span className="text-slate-400">Giao đến:</span>{' '}
                        <strong className="text-slate-800">{ord.address}</strong> (
                        {ord.customerName} - {ord.phone})
                      </div>

                      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-4">
                        <div className="text-right">
                          <span className="text-slate-500 text-xs mr-2">Tổng thanh toán:</span>
                          <span className="text-base font-extrabold text-blue-700 font-mono">
                            {formatPrice(Number(ord.totalAmount))}
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          {ord.status === 'delivered' && (
                            <button
                              onClick={() => {
                                const firstItem = ord.items?.[0];
                                const prodId = firstItem?.productId || firstItem?.productSlug;
                                handleOpenReview(ord.orderCode, ord.phone, prodId);
                              }}
                              className="px-4 py-2 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                              <span>Đánh giá sản phẩm</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 3. Footer */}
      <Footer onOpenReview={() => setIsReviewOpen(true)} />

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        initialOrderCode={reviewOrderCode}
        initialPhone={reviewPhone}
        initialProductId={reviewProdId}
      />
    </div>
  );
}
