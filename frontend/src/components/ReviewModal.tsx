'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  Search,
  CheckCircle2,
  AlertCircle,
  Package,
  ShieldCheck,
  Send,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { trackOrderApi, fetchOrderReviews, submitProductReview } from '@/lib/api';
import { Order, OrderItem, Review } from '@/types';
import { formatPrice } from '@/lib/utils';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderCode?: string;
  initialPhone?: string;
  initialProductId?: string;
  onReviewSubmitted?: (review: Review) => void;
}

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: '1 sao - Rất tệ (Chất lượng kém)',
  2: '2 sao - Chưa hài lòng',
  3: '3 sao - Bình thường / Tạm ổn',
  4: '4 sao - Rất hài lòng',
  5: '5 sao - Tuyệt vời! (Rất khuyên dùng)',
};

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  initialOrderCode = '',
  initialPhone = '',
  initialProductId = '',
  onReviewSubmitted,
}) => {
  const [orderCode, setOrderCode] = useState(initialOrderCode);
  const [phone, setPhone] = useState(initialPhone);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [orderData, setOrderData] = useState<Order | null>(null);
  const [orderReviews, setOrderReviews] = useState<Review[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Selected item being reviewed
  const [reviewingItem, setReviewingItem] = useState<OrderItem | null>(null);
  const [reviewingItemIdx, setReviewingItemIdx] = useState<number | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');

  // Strict helper to check if a review belongs to a given order item (never matching undefined === undefined)
  const doesReviewMatchItem = React.useCallback((r: Review, item: OrderItem): boolean => {
    if (item.productId && r.productId && String(r.productId) === String(item.productId)) {
      return true;
    }
    if (item.productSlug && r.productSlug && r.productSlug === item.productSlug) {
      return true;
    }
    if (item.productId && r.productSlug && r.productSlug === String(item.productId)) {
      return true;
    }
    if (item.productSlug && r.productId && String(r.productId) === item.productSlug) {
      return true;
    }
    return false;
  }, []);

  // Strict helper to check if two order items are the same product
  const isSameOrderItem = React.useCallback((a: OrderItem | null, b: OrderItem | null): boolean => {
    if (!a || !b) return false;
    if (a === b) return true;
    if (a.productId && b.productId) {
      return String(a.productId) === String(b.productId);
    }
    if (a.productSlug && b.productSlug) {
      return a.productSlug === b.productSlug;
    }
    if (a.productName && b.productName) {
      return a.productName === b.productName;
    }
    return false;
  }, []);

  const loadOrderAndReviews = React.useCallback(
    async (codeToSearch: string, phoneToSearch: string, targetProdId?: string) => {
      setErrorMsg('');
      setSubmitSuccess('');
      setReviewingItem(null);
      setReviewingItemIdx(null);

      if (!codeToSearch.trim()) {
        setErrorMsg('Vui lòng nhập mã đơn hàng (ví dụ: BK-1024).');
        return;
      }
      if (!phoneToSearch.trim()) {
        setErrorMsg('Vui lòng nhập số điện thoại đặt hàng để xác thực.');
        return;
      }

      setIsLoadingOrder(true);
      try {
        const res = await trackOrderApi(codeToSearch, phoneToSearch);
        if (res.success && res.data) {
          setOrderData(res.data);

          // Fetch already reviewed items for this order
          const reviews = await fetchOrderReviews(codeToSearch, phoneToSearch);
          setOrderReviews(reviews);

          // If target item specified and not yet reviewed, auto open form for it
          if (targetProdId && res.data.items) {
            const foundIdx = res.data.items.findIndex(
              (it) =>
                (Boolean(it.productId) && String(it.productId) === targetProdId) ||
                (Boolean(it.productSlug) && it.productSlug === targetProdId) ||
                (Boolean(it.productName) && it.productName === targetProdId)
            );
            if (foundIdx !== -1) {
              const found = res.data.items[foundIdx];
              const isAlreadyReviewed = reviews.some((r) => doesReviewMatchItem(r, found));
              if (!isAlreadyReviewed) {
                setReviewingItem(found);
                setReviewingItemIdx(foundIdx);
              }
            }
          } else if (res.data.items && res.data.items.length === 1) {
            const singleItem = res.data.items[0];
            const isAlreadyReviewed = reviews.some((r) => doesReviewMatchItem(r, singleItem));
            if (!isAlreadyReviewed) {
              setReviewingItem(singleItem);
              setReviewingItemIdx(0);
            }
          }
        } else {
          setErrorMsg(res.error || 'Không tìm thấy đơn hàng khớp với mã đơn và số điện thoại đã nhập.');
          setOrderData(null);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Lỗi kết nối máy chủ.');
        setOrderData(null);
      } finally {
        setIsLoadingOrder(false);
      }
    },
    [doesReviewMatchItem]
  );

  useEffect(() => {
    if (isOpen) {
      if (initialOrderCode) setOrderCode(initialOrderCode);
      if (initialPhone) setPhone(initialPhone);

      if (initialOrderCode && initialPhone) {
        loadOrderAndReviews(initialOrderCode, initialPhone, initialProductId);
      }
    } else {
      setSubmitSuccess('');
      setReviewingItem(null);
      setReviewingItemIdx(null);
    }
  }, [isOpen, initialOrderCode, initialPhone, initialProductId, loadOrderAndReviews]);

  if (!isOpen) return null;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrderAndReviews(orderCode, phone);
  };

  const handleStartReview = (item: OrderItem, idx: number) => {
    setReviewingItem(item);
    setReviewingItemIdx(idx);
    setRating(5);
    setComment('');
    setSubmitSuccess('');
    setErrorMsg('');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderData || !reviewingItem) return;

    if (comment.trim().length < 5) {
      setErrorMsg('Vui lòng viết nhận xét tối thiểu 5 ký tự để chia sẻ trải nghiệm.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const targetProd =
      reviewingItem.productSlug ||
      reviewingItem.productId ||
      reviewingItem.productName ||
      '';

    try {
      const res = await submitProductReview({
        orderCode: orderData.orderCode,
        phone: orderData.phone,
        productId: targetProd,
        rating,
        comment: comment.trim(),
      });

      if (res.success && res.data) {
        setSubmitSuccess(
          `Cảm ơn ${orderData.customerName}! Đánh giá ${rating} sao của bạn đã được ghi nhận thành công.`
        );
        setOrderReviews((prev) => [res.data!, ...prev]);
        setReviewingItem(null);
        setReviewingItemIdx(null);
        setComment('');
        if (onReviewSubmitted) {
          onReviewSubmitted(res.data);
        }
      } else {
        setErrorMsg(res.error || 'Gửi đánh giá không thành công.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối khi gửi đánh giá.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper check if an item in order has already been reviewed
  const getExistingReview = (item: OrderItem): Review | undefined => {
    return orderReviews.find((r) => doesReviewMatchItem(r, item));
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
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Đánh giá sản phẩm đã mua</h3>
        </div>
        <p className="text-xs text-slate-500 mb-6">
          Chỉ khách hàng đã nhận hàng thành công mới có thể gửi đánh giá xác thực cho các sản phẩm trong đơn.
        </p>

        {/* If prefilled from order: Show verified badge banner, no manual code/phone entry */}
        {orderData ? (
          <div className="bg-blue-50/80 border border-blue-200/90 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-blue-900 font-mono flex items-center gap-2">
                  <span>{orderData.orderCode}</span>
                  <span className="text-[10px] font-sans font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Đã hoàn thành
                  </span>
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Người nhận: <strong>{orderData.customerName}</strong> • {orderData.phone}
                </div>
              </div>
            </div>
            <div className="text-[11px] text-blue-700 font-medium bg-white px-3 py-1.5 rounded-xl border border-blue-200">
              Đánh giá xác thực (Verified Purchase)
            </div>
          </div>
        ) : isLoadingOrder ? (
          <div className="py-8 flex flex-col items-center justify-center text-slate-500 text-xs gap-2 mb-6">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Đang tải thông tin đơn hàng và sản phẩm...</span>
          </div>
        ) : !initialOrderCode ? (
          /* Search Order Form: Only shown when opened standalone */
          <form onSubmit={handleSearchSubmit} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-6">
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
              disabled={isLoadingOrder}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs shadow-sm shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Xác thực đơn hàng & mở danh sách đánh giá</span>
            </button>
          </form>
        ) : null}

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {submitSuccess && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{submitSuccess}</span>
          </div>
        )}

        {/* Order Details & Items */}
        {orderData && (
          <div className="space-y-6">
            {/* Order status banner */}
            {orderData.status !== 'delivered' ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Đơn hàng {orderData.orderCode} chưa hoàn thành giao hàng (Trạng thái:{' '}
                    <span className="uppercase font-mono font-bold text-amber-700">{orderData.status}</span>)
                  </span>
                </div>
                <p className="text-amber-700 leading-relaxed">
                  Để đảm bảo tính khách quan và uy tín của cộng đồng BK-Store, bạn chỉ có thể đánh giá sản phẩm sau khi đơn hàng được giao thành công đến tay bạn.
                </p>
              </div>
            ) : null}

            {/* List of Products in the Order */}
            {orderData.items && orderData.items.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-slate-400" />
                  <span>Sản phẩm trong đơn hàng:</span>
                </h4>

                <div className="space-y-3">
                  {orderData.items.map((item, idx) => {
                    const existingRev = getExistingReview(item);
                    const itemUnitPrice = Number(item.unitPrice ?? item.price ?? 0);
                    const itemQty = Number(item.quantity ?? 1);
                    const displayName =
                      item.productName || item.productSlug || item.productId || 'Thiết bị công nghệ';
                    const isDelivered = orderData.status === 'delivered';
                    const isCurrentlySelected =
                      reviewingItem !== null &&
                      (reviewingItemIdx !== null
                        ? reviewingItemIdx === idx
                        : isSameOrderItem(reviewingItem, item));

                    return (
                      <div
                        key={item.productId || item.productSlug || idx}
                        className={`p-4 rounded-2xl border transition-all ${
                          isCurrentlySelected
                            ? 'border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/10'
                            : 'border-slate-200/90 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <span className="font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded text-xs shrink-0 mt-0.5">
                              x{itemQty}
                            </span>
                            <div className="min-w-0 flex-1">
                              <h5 className="font-bold text-sm text-slate-900 leading-snug truncate">
                                {displayName}
                              </h5>
                              <p className="text-xs text-blue-600 font-mono font-semibold mt-0.5">
                                {formatPrice(itemUnitPrice)}
                              </p>
                            </div>
                          </div>

                          {/* Review Action */}
                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {existingRev ? (
                              <div className="flex flex-col items-end">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Đã đánh giá ({existingRev.rating} ⭐)</span>
                                </div>
                              </div>
                            ) : isDelivered ? (
                              <button
                                onClick={() => handleStartReview(item, idx)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                  isCurrentlySelected
                                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
                                }`}
                              >
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                                <span>{isCurrentlySelected ? 'Đang viết...' : 'Đánh giá'}</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">
                                Chờ nhận hàng
                              </span>
                            )}
                          </div>
                        </div>

                        {/* If existing review, display small preview */}
                        {existingRev && (
                          <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-xl">
                            <div className="flex items-center gap-1 text-amber-500 mb-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < existingRev.rating
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-200'
                                  }`}
                                />
                              ))}
                              <span className="text-slate-400 text-[10px] ml-1">
                                {new Date(existingRev.createdAt).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                            <p className="italic text-slate-700">&ldquo;{existingRev.comment}&rdquo;</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active Review Form for selected item */}
            {reviewingItem && (
              <form
                onSubmit={handleSubmitReview}
                className="p-5 rounded-2xl bg-gradient-to-b from-blue-50/60 to-slate-50 border border-blue-200/80 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200"
              >
                <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900">
                      Viết đánh giá cho:{' '}
                      <span className="text-blue-700 font-extrabold">
                        {reviewingItem.productName || reviewingItem.productSlug || reviewingItem.productId}
                      </span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReviewingItem(null);
                      setReviewingItemIdx(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>

                {/* Star Rating Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Chất lượng sản phẩm & mức độ hài lòng:
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((starVal) => {
                        const isActive = (hoverRating || rating) >= starVal;
                        return (
                          <button
                            key={starVal}
                            type="button"
                            onClick={() => setRating(starVal)}
                            onMouseEnter={() => setHoverRating(starVal)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="p-1.5 rounded-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                            title={`${starVal} sao`}
                          >
                            <Star
                              className={`w-7 h-7 transition-colors ${
                                isActive
                                  ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                                  : 'text-slate-300'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-xs font-semibold text-amber-700 ml-2">
                      {RATING_DESCRIPTIONS[hoverRating || rating]}
                    </span>
                  </div>
                </div>

                {/* Reviewer info */}
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    Người đánh giá: <strong className="text-slate-800">{orderData.customerName}</strong>{' '}
                    (Đơn hàng #{orderData.orderCode.replace(/^#/, '')})
                  </span>
                </div>

                {/* Comment Textarea */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nhận xét chi tiết:
                  </label>
                  <textarea
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Hãy chia sẻ cảm nhận thực tế của bạn về chất lượng sản phẩm, hiệu năng, đóng gói và dịch vụ giao hàng của BK-Store..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:border-blue-500 bg-white outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>Tối thiểu 5 ký tự</span>
                    <span>{comment.length} / 1000 ký tự</span>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReviewingItem(null);
                      setReviewingItemIdx(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || comment.trim().length < 5}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Gửi đánh giá xác thực</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
