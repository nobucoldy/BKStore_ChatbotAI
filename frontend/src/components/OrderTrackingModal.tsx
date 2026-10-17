'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Search,
  ShieldCheck,
  AlertCircle,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  Star,
  Sparkles,
  RotateCcw,
  UserCheck,
} from 'lucide-react';
import { trackOrderApi, fetchMyOrdersApi } from '@/lib/api';
import { Order, OrderItem, OrderStatus } from '@/types';
import { formatPrice } from '@/lib/utils';
import { ReviewModal } from './ReviewModal';
import { useAuthStore } from '@/store/authStore';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderCode?: string;
  initialPhone?: string;
  onOpenReviewModal?: (orderCode: string, phone: string, productId?: string) => void;
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  initialOrderCode = '',
  initialPhone = '',
  onOpenReviewModal,
}) => {
  const { user, isAuthenticated } = useAuthStore();
  const [orderCode, setOrderCode] = useState(initialOrderCode);
  const [phone, setPhone] = useState(initialPhone);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [orderData, setOrderData] = useState<Order | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewTargetProdId, setReviewTargetProdId] = useState('');
  const [showSearchForm, setShowSearchForm] = useState(false);

  const handleSearch = useCallback(async (codeToSearch: string, phoneToSearch: string) => {
    setErrorMsg('');

    if (!codeToSearch.trim()) {
      setErrorMsg('Vui lòng nhập mã đơn hàng (ví dụ: BK-1024).');
      return;
    }

    if (!phoneToSearch.trim()) {
      setErrorMsg('Vui lòng nhập số điện thoại dùng đặt hàng để xác thực bảo mật.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await trackOrderApi(codeToSearch, phoneToSearch);
      if (res.success && res.data) {
        setOrderData(res.data);
        setShowSearchForm(false);
      } else {
        setErrorMsg(res.error || 'Không tìm thấy đơn hàng khớp với mã đơn và số điện thoại đã nhập.');
        setOrderData(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ.';
      setErrorMsg(msg);
      setOrderData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setOrderData(null);
      setErrorMsg('');
      setIsLoading(false);
      setShowSearchForm(false);
      return;
    }

    setErrorMsg('');

    // Case 1: An explicit order code and phone were passed (e.g. from checkout or order action)
    if (initialOrderCode && initialPhone) {
      setOrderCode(initialOrderCode);
      setPhone(initialPhone);
      handleSearch(initialOrderCode, initialPhone);
      return;
    }

    // Case 2: Opened standalone, user is authenticated -> auto-load latest order
    if (isAuthenticated) {
      let ignore = false;
      setIsLoading(true);
      fetchMyOrdersApi()
        .then((res) => {
          if (ignore) return;
          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            const latest = res.data[0];
            setOrderData(latest);
            setOrderCode(latest.orderCode);
            setPhone(latest.phone);
            setShowSearchForm(false);
          } else {
            setShowSearchForm(true);
          }
        })
        .catch(() => {
          if (!ignore) setShowSearchForm(true);
        })
        .finally(() => {
          if (!ignore) setIsLoading(false);
        });

      return () => {
        ignore = true;
      };
    }

    // Case 3: Unauthenticated and no props -> show manual search form
    setShowSearchForm(true);
  }, [isOpen, initialOrderCode, initialPhone, isAuthenticated, handleSearch]);

  if (!isOpen) return null;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(orderCode, phone);
  };

  // Status Stepper helpers
  const steps: { key: OrderStatus; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'pending', label: 'Chờ xác nhận', icon: Clock },
    { key: 'confirmed', label: 'Đã xác nhận', icon: Package },
    { key: 'shipping', label: 'Đang vận chuyển', icon: Truck },
    { key: 'delivered', label: 'Đã giao hàng', icon: CheckCircle2 },
  ];

  const getStepStatus = (stepKey: OrderStatus, currentStatus: OrderStatus) => {
    if (currentStatus === 'cancelled') return 'cancelled';
    const orderIndexMap: Record<OrderStatus, number> = {
      pending: 0,
      confirmed: 1,
      shipping: 2,
      delivered: 3,
      cancelled: -1,
    };
    const currentIdx = orderIndexMap[currentStatus];
    const stepIdx = orderIndexMap[stepKey];

    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'current';
    return 'upcoming';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col p-6 md:p-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Tiến trình vận đơn</h3>
              <p className="text-xs text-slate-500">
                Theo dõi hành trình đóng gói, xuất kho và vận chuyển thực tế từ BK-Store.
              </p>
            </div>
          </div>

          {orderData && (
            <button
              onClick={() => setShowSearchForm((prev) => !prev)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer mr-8 sm:mr-0"
            >
              {showSearchForm ? 'Đóng tra cứu' : 'Tra cứu đơn khác'}
            </button>
          )}
        </div>

        {/* Search Form (collapsible if orderData already exists) */}
        {(showSearchForm || !orderData) && !isLoading && (
          <form onSubmit={onSubmit} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 my-4 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mã đơn hàng</label>
                <input
                  type="text"
                  value={orderCode}
                  onChange={(e) => setOrderCode(e.target.value)}
                  placeholder="Ví dụ: BK-1024"
                  className="w-full text-xs font-mono uppercase bg-white px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại đặt hàng</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912345678"
                  className="w-full text-xs font-mono bg-white px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Kiểm tra trạng thái đơn hàng</span>
            </button>
          </form>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-xs gap-3 my-4 bg-slate-50/50 rounded-2xl border border-slate-100">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="font-medium text-slate-600">Đang tra cứu tiến trình đơn hàng...</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="my-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Order Result Details */}
        {orderData && (
          <div className="border border-slate-200 rounded-2xl p-5 space-y-5 my-3 bg-white shadow-2xs animate-in fade-in">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Mã đơn hàng:</span>
                <span className="text-base font-bold text-blue-700 font-mono">{orderData.orderCode}</span>
                <span className="text-[10px] font-sans font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full uppercase">
                  {orderData.status}
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                {new Date(orderData.createdAt).toLocaleString('vi-VN')}
              </div>
            </div>

            {/* Stepper Timeline */}
            {orderData.status === 'cancelled' ? (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-center">
                <div className="flex items-center justify-center gap-2 text-rose-700 font-bold text-sm mb-1">
                  <XCircle className="w-5 h-5" />
                  <span>Đơn hàng đã bị hủy</span>
                </div>
                <p className="text-xs text-rose-600">
                  {orderData.trackingInfo || 'Đơn hàng này đã được hủy theo yêu cầu của khách hàng hoặc hết hàng.'}
                </p>
              </div>
            ) : (
              <div className="py-2">
                <div className="grid grid-cols-4 gap-2 relative">
                  {steps.map((step) => {
                    const status = getStepStatus(step.key, orderData.status);
                    const StepIcon = step.icon;
                    return (
                      <div key={step.key} className="flex flex-col items-center text-center">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-colors mb-1.5 ${
                            status === 'completed'
                              ? 'bg-emerald-600 text-white'
                              : status === 'current'
                              ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          <StepIcon className="w-4 h-4" />
                        </div>
                        <span
                          className={`text-[11px] font-medium leading-tight ${
                            status === 'current' ? 'text-blue-700 font-bold' : 'text-slate-600'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {orderData.trackingInfo && (
                  <div className="mt-4 p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-800 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Cập nhật vận chuyển:</strong> {orderData.trackingInfo}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recipient info */}
            <div className="bg-slate-50 p-3.5 rounded-xl text-xs space-y-1.5 text-slate-600">
              <div><strong className="text-slate-800">Người nhận:</strong> {orderData.customerName} - {orderData.phone}</div>
              <div><strong className="text-slate-800">Địa chỉ giao:</strong> {orderData.address}</div>
              {orderData.branchName && (
                <div><strong className="text-slate-800">Kho xuất hàng:</strong> <span className="text-blue-700 font-semibold">{orderData.branchName}</span></div>
              )}
              <div><strong className="text-slate-800">Hình thức thanh toán:</strong> {orderData.paymentMethod === 'COD' ? 'Thanh toán tiền mặt khi nhận hàng (COD)' : 'Chuyển khoản VietQR'}</div>
            </div>

            {/* Items */}
            {orderData.items && orderData.items.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Danh sách sản phẩm trong đơn ({orderData.items.length}):
                  </h5>
                  {orderData.status === 'delivered' && (
                    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span>Có thể đánh giá sản phẩm</span>
                    </span>
                  )}
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {orderData.items.map((item, idx) => {
                    const itemUnitPrice = Number(item.unitPrice ?? item.price ?? 0);
                    const itemQty = Number(item.quantity ?? 1);
                    const itemTotalPrice = itemUnitPrice * itemQty;
                    const displayName =
                      item.productName || item.productSlug || item.productId || 'Thiết bị công nghệ';
                    const targetProd = item.productSlug || item.productId || item.productName || '';

                    return (
                      <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] shrink-0">
                            x{itemQty}
                          </span>
                          <span className="font-semibold text-slate-800 truncate">
                            {displayName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="font-mono font-bold text-blue-700">
                            {formatPrice(itemTotalPrice)}
                          </span>
                          {orderData.status === 'delivered' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (onOpenReviewModal) {
                                  onOpenReviewModal(orderData.orderCode, orderData.phone, targetProd);
                                } else {
                                  setReviewTargetProdId(targetProd);
                                  setIsReviewModalOpen(true);
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                              title="Đánh giá sản phẩm này"
                            >
                              <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                              <span>Đánh giá</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Total */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Tổng giá trị đơn hàng:</span>
              <span className="text-base font-extrabold text-blue-700 font-mono">
                {formatPrice(orderData.totalAmount)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Review Modal embedded */}
      {isReviewModalOpen && orderData && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          initialOrderCode={orderData.orderCode}
          initialPhone={orderData.phone}
          initialProductId={reviewTargetProdId}
        />
      )}
    </div>
  );
};
