'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Eye, Sparkles } from 'lucide-react';
import { Product } from '@/types';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';

interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
  onAskAI?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAskAI,
}) => {
  const router = useRouter();
  const [isPopping, setIsPopping] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const openAuthModal = useAuthStore((state) => state.openAuthModal);

  const stock = product.stock ?? product.stock_quantity ?? 0;
  const isOutOfStock = stock <= 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    if (!isAuthenticated) {
      openAuthModal('Vui lòng đăng nhập tài khoản để thêm sản phẩm vào giỏ hàng.');
      return;
    }
    const res = addItem(product, 1);
    if (res.success) {
      setIsPopping(true);
      setTimeout(() => setIsPopping(false), 700);
    }
  };

  const handleBrandClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/brands/${encodeURIComponent(product.brand.toLowerCase())}`);
  };

  const discountPercent =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  // Extract key specs for chip display
  const specChips = Object.entries(product.specs || {}).slice(0, 3);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group bg-white rounded-2xl border border-slate-200/80 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col overflow-hidden cursor-pointer relative block"
    >
      {/* Top badges */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBrandClick}
          className="px-2.5 py-1 text-[11px] font-mono font-bold tracking-wider uppercase bg-slate-900/80 hover:bg-blue-600 backdrop-blur-xs text-white rounded-lg transition-all shadow-xs cursor-pointer active:scale-95 z-20"
          title={`Xem tất cả sản phẩm của thương hiệu ${product.brand}`}
        >
          {product.brand}
        </button>
        {discountPercent > 0 && (
          <span className="pointer-events-none px-2 py-0.5 text-[11px] font-bold bg-rose-500 text-white rounded-md shadow-xs">
            -{discountPercent}%
          </span>
        )}
      </div>

      {/* Image Showcase */}
      <div className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden flex items-center justify-center p-4">
        <img
          src={product.thumbnail}
          alt={product.name}
          className={`w-full h-full object-contain mix-blend-multiply group-hover:scale-108 transition-transform duration-500 ${
            isOutOfStock ? 'grayscale opacity-75' : ''
          }`}
          loading="lazy"
        />

        {/* Quick View Overlay Indicator */}
        <span
          className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-white/90 text-slate-800 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600 hover:text-white pointer-events-none"
          title="Xem chi tiết sản phẩm"
        >
          <Eye className="w-5 h-5" />
        </span>
      </div>

      {/* Product Content */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div>
          {/* Title */}
          <h3 className="font-semibold text-slate-900 text-sm line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
            {product.name}
          </h3>

          {/* Spec Chips */}
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {specChips.map(([key, val]) => (
              <span
                key={key}
                className="inline-block text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md truncate max-w-[150px]"
                title={`${key}: ${val}`}
              >
                {val}
              </span>
            ))}
          </div>
        </div>

        {/* Status & Pricing & Actions */}
        <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
          {/* Status badge */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            {isOutOfStock ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span className="text-rose-600 font-semibold">Tạm hết hàng</span>
              </>
            ) : stock <= 3 ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span className="text-amber-700 font-semibold">Chỉ còn {stock} máy</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-slate-500">Chính hãng • Sẵn hàng giao ngay</span>
              </>
            )}
          </div>

          {/* Price & Action Buttons */}
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <div className="flex flex-col">
              <span className="text-base font-bold text-blue-700 font-mono">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-xs text-slate-400 line-through font-mono">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Nút Thêm vào giỏ với hiệu ứng giỏ hàng nhảy nảy */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`relative px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs active:scale-90 ${
                  isOutOfStock
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                    : isPopping
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/40 ring-2 ring-blue-400/50 scale-105'
                    : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-blue-500/20'
                }`}
                title={
                  isOutOfStock
                    ? 'Sản phẩm tạm thời hết hàng'
                    : !isAuthenticated
                    ? 'Đăng nhập để thêm vào giỏ hàng'
                    : 'Thêm vào giỏ hàng'
                }
              >
                <ShoppingCart
                  className={`w-3.5 h-3.5 transition-transform ${
                    isPopping ? 'animate-cart-jump text-amber-300 scale-125' : ''
                  }`}
                />
                <span>{isOutOfStock ? 'Hết hàng' : 'Thêm'}</span>

                {isPopping && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 pointer-events-none text-[10px] font-mono font-black bg-blue-600 text-white px-2 py-0.5 rounded-full shadow-lg border border-white/60 animate-float-up z-20 whitespace-nowrap">
                    +1
                  </span>
                )}
              </button>

              {/* Nút Hỏi nhanh Chatbot (Icon nhỏ gọn nằm bên phải nút Thêm) */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAskAI?.(product);
                }}
                className="w-8 h-8 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-600 hover:text-cyan-700 border border-cyan-200/90 transition-all flex items-center justify-center shadow-xs active:scale-95"
                title="Hỏi trợ lý AI BK-Bot về sản phẩm này"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};
