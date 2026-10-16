'use client';

import React, { useState, useEffect } from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, AlertTriangle, Lock, Check, Minus } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/lib/utils';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onProceedToCheckout,
}) => {
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    toggleSelectItem,
    selectAllItems,
  } = useCartStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const openAuthModal = useAuthStore((state) => state.openAuthModal);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  // Transition & Animation state for smooth slide-in and slide-out
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isShowing, setIsShowing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const timer = requestAnimationFrame(() => {
        setIsShowing(true);
      });
      document.body.style.overflow = 'hidden';
      return () => cancelAnimationFrame(timer);
    } else {
      setIsShowing(false);
      document.body.style.overflow = '';
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Cleanup body overflow on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!shouldRender) return null;

  const handleUpdate = (productId: string, newQty: number) => {
    const res = updateQuantity(productId, newQty);
    if (!res.success && res.message) {
      setWarningMsg(res.message);
      setTimeout(() => setWarningMsg(null), 3500);
    }
  };

  // Selection calculations
  const selectedItems = items.filter((item) => item.selected !== false);
  const selectedCount = selectedItems.length;
  const isAllSelected = items.length > 0 && items.every((item) => item.selected !== false);
  const isPartiallySelected = selectedCount > 0 && !isAllSelected;

  const selectedTotalPrice = selectedItems.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  );

  // Check if any SELECTED item exceeds available stock or is out of stock
  const selectedOverstockItem = selectedItems.find(({ product, quantity }) => {
    const maxStock = product.stock ?? product.stock_quantity ?? 0;
    return quantity > maxStock || maxStock <= 0;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* 1. Backdrop Overlay with smooth Fade-In / Fade-Out (Click outside to close) */}
      <div
        onClick={onClose}
        aria-label="Đóng giỏ hàng"
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 ease-in-out cursor-pointer ${
          isShowing ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* 2. Slide-out panel container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
        <div
          onClick={(e) => e.stopPropagation()} // Stop propagation so clicking inside drawer doesn't close it
          className={`w-screen max-w-md bg-white shadow-2xl flex flex-col pointer-events-auto transform transition-transform duration-300 ease-out ${
            isShowing ? 'translate-x-0' : 'translate-x-full ease-in'
          }`}
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">Giỏ hàng của bạn</h2>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {items.length} món
              </span>
            </div>
            <button
              onClick={onClose}
              aria-label="Đóng giỏ hàng"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Select All Toolbar */}
          {items.length > 0 && (
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => selectAllItems(!isAllSelected)}
                className="flex items-center gap-2.5 font-semibold text-slate-700 hover:text-blue-700 transition-colors cursor-pointer select-none"
              >
                <div
                  className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all ${
                    isAllSelected
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : isPartiallySelected
                      ? 'bg-blue-100 border-blue-500 text-blue-600'
                      : 'border-slate-300 bg-white hover:border-blue-400'
                  }`}
                >
                  {isAllSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  {isPartiallySelected && <Minus className="w-3 h-3 stroke-[3]" />}
                </div>
                <span>Chọn tất cả ({items.length})</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">
                  Đã chọn: <b className="text-blue-700 font-bold">{selectedCount}</b>/{items.length}
                </span>
                {selectedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => selectAllItems(false)}
                    className="text-[11px] text-slate-400 hover:text-rose-600 underline cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Warning banner if stock adjusted */}
          {warningMsg && (
            <div className="mx-5 mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-medium leading-tight">{warningMsg}</span>
            </div>
          )}

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <ShoppingBag className="w-16 h-16 text-slate-200 stroke-1 mb-3" />
                {!isAuthenticated ? (
                  <>
                    <p className="text-sm font-bold text-slate-800">Bạn chưa đăng nhập</p>
                    <p className="text-xs text-slate-500 mt-1.5 max-w-xs leading-relaxed">
                      Chỉ thành viên đã đăng nhập tài khoản mới có thể thêm sản phẩm và mua hàng tại BK-Store.
                    </p>
                    <button
                      onClick={() => {
                        onClose();
                        openAuthModal('Vui lòng đăng nhập để lưu trữ giỏ hàng và đặt hàng.');
                      }}
                      className="mt-5 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 active:bg-blue-800 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                    >
                      Đăng nhập / Đăng ký ngay
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-slate-600">Giỏ hàng của bạn đang trống</p>
                    <p className="text-xs text-slate-400 mt-1">Hãy khám phá các thiết bị flagship tại BK-Store!</p>
                    <button
                      onClick={onClose}
                      className="mt-5 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                    >
                      Mua sắm ngay
                    </button>
                  </>
                )}
              </div>
            ) : (
              items.map(({ product, quantity, selected }) => {
                const isSelected = selected !== false;
                const maxStock = product.stock ?? product.stock_quantity ?? 0;
                const isOutOfStock = maxStock <= 0;
                const isMaxReached = quantity >= maxStock;

                return (
                  <div
                    key={product.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                      isSelected
                        ? isOutOfStock
                          ? 'border-rose-300 bg-rose-50/40'
                          : isMaxReached
                          ? 'border-amber-300 bg-amber-50/30'
                          : 'border-blue-200 bg-blue-50/20 shadow-xs'
                        : 'border-slate-200 bg-slate-50/50 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleSelectItem(product.id)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0 mt-3.5 ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                          : 'border-slate-300 bg-white hover:border-blue-400'
                      }`}
                      aria-label={isSelected ? 'Bỏ chọn sản phẩm' : 'Chọn sản phẩm'}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    {/* Thumbnail */}
                    <img
                      src={product.thumbnail}
                      alt={product.name}
                      className="w-16 h-16 object-contain rounded-lg bg-white p-1 border border-slate-200 shrink-0"
                    />

                    {/* Product Details */}
                    <div className="flex-1 flex flex-col justify-between min-w-0 self-stretch">
                      <div className="flex items-start justify-between gap-1">
                        <h4
                          onClick={() => toggleSelectItem(product.id)}
                          className="text-xs font-semibold text-slate-900 line-clamp-1 cursor-pointer hover:text-blue-600 transition-colors"
                          title={product.name}
                        >
                          {product.name}
                        </h4>
                        <button
                          onClick={() => removeItem(product.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                          title="Xóa khỏi giỏ hàng"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden text-xs">
                            <button
                              onClick={() => handleUpdate(product.id, quantity - 1)}
                              className="px-2.5 py-0.5 text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                              title="Giảm số lượng"
                            >
                              -
                            </button>
                            <span className="px-2 font-mono font-medium">{quantity}</span>
                            <button
                              onClick={() => handleUpdate(product.id, quantity + 1)}
                              disabled={isMaxReached || isOutOfStock}
                              className="px-2.5 py-0.5 text-slate-600 hover:bg-slate-100 font-bold disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                              title={isMaxReached ? `Đã đạt giới hạn tồn kho (${maxStock} máy)` : 'Tăng số lượng'}
                            >
                              +
                            </button>
                          </div>

                          {isOutOfStock ? (
                            <span className="text-[10px] font-bold text-rose-600">Hết hàng</span>
                          ) : isMaxReached ? (
                            <span className="text-[10px] text-amber-700 font-medium font-mono">
                              (Tối đa: {maxStock})
                            </span>
                          ) : null}
                        </div>

                        <span className={`text-xs font-mono font-bold ${isSelected ? 'text-blue-700' : 'text-slate-500'}`}>
                          {formatPrice(product.price * quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Summary & Checkout Button */}
          {items.length > 0 && (
            <div className="p-5 border-t border-slate-200 bg-slate-50 flex flex-col gap-3.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-medium">Tạm tính:</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {selectedCount} món đã chọn
                  </span>
                </div>
                <span className="text-lg font-extrabold text-blue-700 font-mono">
                  {formatPrice(selectedTotalPrice)}
                </span>
              </div>

              {selectedOverstockItem && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>
                    Sản phẩm &quot;{selectedOverstockItem.product.name}&quot; đã vượt tồn kho hoặc hết hàng. Vui lòng điều chỉnh hoặc bỏ chọn.
                  </span>
                </div>
              )}

              {selectedCount === 0 && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Vui lòng tích chọn ít nhất 1 món để đặt hàng.</span>
                </div>
              )}

              <div className="text-[11px] text-slate-500">
                Đã bao gồm VAT và miễn phí giao hàng toàn quốc tiêu chuẩn.
              </div>

              {!isAuthenticated && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs flex items-center gap-2">
                  <Lock className="w-4 h-4 shrink-0 text-amber-600" />
                  <span className="leading-tight font-medium">
                    Yêu cầu đăng nhập tài khoản trước khi hoàn tất đặt hàng.
                  </span>
                </div>
              )}

              <div className="flex gap-2.5">
                <button
                  onClick={clearCart}
                  className="px-3.5 py-3 rounded-xl border border-slate-200 text-slate-500 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Xóa giỏ
                </button>
                <button
                  onClick={() => {
                    if (selectedCount === 0 || selectedOverstockItem) return;
                    onClose();
                    onProceedToCheckout();
                  }}
                  disabled={selectedCount === 0 || !!selectedOverstockItem}
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span>
                    {selectedCount === 0
                      ? 'Chọn món để đặt hàng'
                      : `Tiến hành Đặt hàng (${selectedCount})`}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

