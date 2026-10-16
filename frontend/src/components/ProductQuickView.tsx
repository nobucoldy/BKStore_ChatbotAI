'use client';

import React, { useState } from 'react';
import { X, ShoppingBag, Sparkles, Package } from 'lucide-react';
import { Product } from '@/types';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';

interface ProductQuickViewProps {
  product: Product | null;
  onClose: () => void;
  onBuyNow: (product: Product, quantity: number) => void;
  onOpenChatWithProduct: (productName: string) => void;
}

export const ProductQuickView: React.FC<ProductQuickViewProps> = ({
  product,
  onClose,
  onBuyNow,
  onOpenChatWithProduct,
}) => {
  const [selectedImg, setSelectedImg] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [isPopping, setIsPopping] = useState(false);

  const addItem = useCartStore((state) => state.addItem);
  const cartQty = useCartStore((state) => (product ? state.getItemQuantity(product.id) : 0));
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const openAuthModal = useAuthStore((state) => state.openAuthModal);

  if (!product) return null;

  const currentImage = selectedImg || product.thumbnail;
  const images = product.images && product.images.length > 0 ? product.images : [product.thumbnail];

  const stock = product.stock ?? product.stock_quantity ?? 0;
  const isOutOfStock = stock <= 0;
  const availableToAdd = Math.max(0, stock - cartQty);
  const isReachedMaxInCart = cartQty >= stock && stock > 0;

  const handleAddToCart = () => {
    if (isOutOfStock || isReachedMaxInCart) return;
    if (!isAuthenticated) {
      onClose();
      openAuthModal('Vui lòng đăng nhập tài khoản để thêm sản phẩm vào giỏ hàng.');
      return;
    }
    const res = addItem(product, quantity);
    if (res.success) {
      setIsPopping(true);
      setTimeout(() => setIsPopping(false), 700);
    }
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    if (!isAuthenticated) {
      onClose();
      openAuthModal('Vui lòng đăng nhập tài khoản để đặt mua sản phẩm.');
      return;
    }
    const res = addItem(product, quantity);
    if (res.success) {
      onBuyNow(product, quantity);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 md:p-8">
          
          {/* Left: Gallery */}
          <div className="md:col-span-6 flex flex-col gap-4">
            <div className="aspect-4/3 rounded-2xl bg-slate-100 border border-slate-200/80 p-6 flex items-center justify-center overflow-hidden">
              <img
                src={currentImage}
                alt={product.name}
                className={`w-full h-full object-contain mix-blend-multiply ${
                  isOutOfStock ? 'grayscale opacity-75' : ''
                }`}
              />
            </div>

            {/* Sub images */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImg(img)}
                    className={`w-16 h-16 rounded-xl border-2 p-1 bg-slate-50 shrink-0 transition-all ${
                      currentImage === img ? 'border-blue-600 scale-95' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <img src={img} alt="thumbnail" className="w-full h-full object-contain mix-blend-multiply" />
                  </button>
                ))}
              </div>
            )}

            {/* AI Advisor Prompt button */}
            <button
              onClick={() => onOpenChatWithProduct(product.name)}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-cyan-600" />
              <span>Hỏi BK-Bot: &ldquo;Cấu hình {product.name} có hợp với tôi?&rdquo;</span>
            </button>
          </div>

          {/* Right: Info & Specs */}
          <div className="md:col-span-6 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-blue-100 text-blue-700">
                  {product.brand}
                </span>
                <span className="text-xs text-slate-500 font-mono">Bảo hành {product.warrantyMonths || 12} tháng</span>
              </div>

              <h2 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">
                {product.name}
              </h2>

              {/* Price & Stock status */}
              <div className="flex items-center justify-between my-3 flex-wrap gap-2">
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-extrabold text-blue-700 font-mono">
                    {formatPrice(product.price)}
                  </span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-sm text-slate-400 line-through font-mono">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                </div>

                {/* Stock badge */}
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  {isOutOfStock ? (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 font-bold">
                      Tạm hết hàng
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-blue-600" />
                      <span>Kho: <strong>{stock}</strong> máy</span>
                      {cartQty > 0 && (
                        <span className="text-blue-600 font-semibold">({cartQty} trong giỏ)</span>
                      )}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                {product.description}
              </p>

              {/* Detailed Specs Table */}
              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Thông số kỹ thuật cốt lõi
                </h4>
                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs overflow-hidden">
                  {Object.entries(product.specs || {}).map(([key, val]) => (
                    <div key={key} className="flex py-2 px-3 bg-slate-50/50">
                      <span className="w-28 font-medium text-slate-500 shrink-0">{key}:</span>
                      <span className="font-semibold text-slate-800 font-mono">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Bottom Actions: Quantity + Add to Cart & Buy Now */}
            <div className="pt-4 border-t border-slate-200 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-700">Số lượng:</span>
                  <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-slate-50">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1 || isOutOfStock}
                      className="px-3 py-1 text-slate-600 hover:bg-slate-200 font-bold disabled:opacity-40 disabled:hover:bg-slate-50"
                    >
                      -
                    </button>
                    <span className="px-3 py-1 font-mono text-sm font-semibold text-slate-800 min-w-[36px] text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      disabled={quantity >= availableToAdd || isOutOfStock}
                      className="px-3 py-1 text-slate-600 hover:bg-slate-200 font-bold disabled:opacity-40 disabled:hover:bg-slate-50"
                      title={quantity >= availableToAdd ? 'Đã đạt giới hạn số lượng còn lại' : 'Tăng số lượng'}
                    >
                      +
                    </button>
                  </div>
                </div>

                {availableToAdd > 0 && availableToAdd <= 3 && (
                  <span className="text-[11px] text-amber-700 font-mono font-medium">
                    (Có thể thêm tối đa {availableToAdd} máy)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || isReachedMaxInCart}
                  className={`relative py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                    isOutOfStock || isReachedMaxInCart
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      : isPopping
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-400/50 scale-[1.02]'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                  }`}
                >
                  <ShoppingBag
                    className={`w-4 h-4 transition-transform ${
                      isPopping ? 'animate-cart-jump text-amber-300 scale-125' : ''
                    }`}
                  />
                  <span>
                    {isOutOfStock
                      ? 'Hết hàng'
                      : isReachedMaxInCart
                      ? 'Đã đạt tối đa'
                      : 'Thêm vào giỏ'}
                  </span>

                  {isPopping && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 pointer-events-none text-xs font-mono font-black bg-blue-600 text-white px-2.5 py-0.5 rounded-full shadow-lg border border-white/60 animate-float-up z-20 whitespace-nowrap">
                      +{quantity}
                    </span>
                  )}
                </button>

                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className={`py-3 px-4 rounded-xl font-semibold text-sm shadow-md transition-all text-center ${
                    isOutOfStock
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-500/20'
                  }`}
                >
                  Mua ngay
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
