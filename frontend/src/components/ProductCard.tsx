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
  themeColor?: 'amber' | 'blue' | 'indigo' | 'emerald' | 'default';
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAskAI,
  themeColor = 'default',
}) => {
  const router = useRouter();
  const [isPopping, setIsPopping] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const openAuthModal = useAuthStore((state) => state.openAuthModal);

  const stock = product.stock ?? product.stock_quantity ?? 0;
  const isOutOfStock = stock <= 0;

  const themeStyles = {
    amber: {
      card: 'border-2 border-amber-400/90 bg-white shadow-md shadow-amber-500/10 hover:border-amber-500 hover:shadow-2xl hover:shadow-amber-500/25 hover:-translate-y-1.5',
      imageBg: 'bg-gradient-to-b from-amber-50/80 via-white to-amber-50/20',
      priceColor: 'text-rose-600',
      btnColor: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/30',
      topLine: 'bg-gradient-to-r from-amber-400 to-orange-500',
    },
    blue: {
      card: 'border-2 border-blue-400/90 bg-white shadow-md shadow-blue-500/10 hover:border-blue-600 hover:shadow-2xl hover:shadow-blue-500/25 hover:-translate-y-1.5',
      imageBg: 'bg-gradient-to-b from-blue-50/80 via-white to-blue-50/20',
      priceColor: 'text-blue-700',
      btnColor: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/30',
      topLine: 'bg-gradient-to-r from-blue-400 to-cyan-500',
    },
    indigo: {
      card: 'border-2 border-indigo-400/90 bg-white shadow-md shadow-indigo-500/10 hover:border-indigo-600 hover:shadow-2xl hover:shadow-indigo-500/25 hover:-translate-y-1.5',
      imageBg: 'bg-gradient-to-b from-indigo-50/80 via-white to-indigo-50/20',
      priceColor: 'text-indigo-700',
      btnColor: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/30',
      topLine: 'bg-gradient-to-r from-indigo-400 to-purple-500',
    },
    emerald: {
      card: 'border-2 border-emerald-400/90 bg-white shadow-md shadow-emerald-500/10 hover:border-emerald-600 hover:shadow-2xl hover:shadow-emerald-500/25 hover:-translate-y-1.5',
      imageBg: 'bg-gradient-to-b from-emerald-50/80 via-white to-emerald-50/20',
      priceColor: 'text-emerald-700',
      btnColor: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/30',
      topLine: 'bg-gradient-to-r from-emerald-400 to-teal-500',
    },
    default: {
      card: 'border-2 border-slate-200/90 bg-white shadow-sm hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1',
      imageBg: 'bg-slate-50',
      priceColor: 'text-blue-700',
      btnColor: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20',
      topLine: 'bg-slate-200',
    },
  }[themeColor || 'default'];

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
      className={`group bg-white rounded-2xl ${themeStyles.card} transition-all duration-300 flex flex-col overflow-hidden cursor-pointer relative block shadow-xs`}
    >
      {/* Top Color Accent Line */}
      <div className={`h-1.5 w-full ${themeStyles.topLine}`}></div>

      {/* Top badges */}
      <div className="absolute top-4 left-3 right-3 z-10 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBrandClick}
          className="px-2.5 py-1 text-[11px] font-mono font-bold tracking-wider uppercase bg-slate-900/85 hover:bg-blue-600 backdrop-blur-xs text-white rounded-lg transition-all shadow-xs cursor-pointer active:scale-95 z-20"
          title={`Xem tất cả sản phẩm của thương hiệu ${product.brand}`}
        >
          {product.brand}
        </button>
        {discountPercent > 0 && (
          <span className="pointer-events-none px-2 py-0.5 text-[11px] font-extrabold bg-rose-500 text-white rounded-md shadow-xs">
            -{discountPercent}%
          </span>
        )}
      </div>

      {/* Image Showcase (Clean, crisp product rendering with soft drop shadow) */}
      <div className={`relative aspect-4/3 w-full ${themeStyles.imageBg} overflow-hidden flex items-center justify-center p-4 transition-colors`}>
        <img
          src={product.thumbnail}
          alt={product.name}
          className={`w-full h-full object-contain drop-shadow-sm group-hover:scale-110 transition-transform duration-500 ${
            isOutOfStock ? 'grayscale opacity-75' : ''
          }`}
          loading="lazy"
        />

        {/* Quick View Overlay Indicator */}
        <span
          className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-white/95 text-slate-800 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600 hover:text-white pointer-events-none"
          title="Xem chi tiết sản phẩm"
        >
          <Eye className="w-5 h-5" />
        </span>
      </div>

      {/* Product Content */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div>
          {/* Title */}
          <h3 className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
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
                <span className="text-slate-500 font-medium">Chính hãng • Sẵn hàng giao ngay</span>
              </>
            )}
          </div>

          {/* Price & Action Buttons */}
          <div className="flex items-center justify-between gap-1.5 mt-0.5">
            <div className="flex flex-col min-w-0 pr-1">
              <span className={`text-sm sm:text-base font-black ${themeStyles.priceColor} font-mono tracking-tight truncate`}>
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-[11px] text-slate-400 line-through font-mono truncate">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Nút Thêm vào giỏ với màu sắc theo chủ đề và hiệu ứng nảy */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`relative px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all active:scale-90 cursor-pointer shrink-0 ${
                  isOutOfStock
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                    : isPopping
                    ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400/50 scale-105'
                    : themeStyles.btnColor
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
                <span className="text-[11px] sm:text-xs">{isOutOfStock ? 'Hết hàng' : 'Thêm'}</span>

                {isPopping && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 pointer-events-none text-[10px] font-mono font-black bg-blue-600 text-white px-2 py-0.5 rounded-full shadow-lg border border-white/60 animate-float-up z-20 whitespace-nowrap">
                    +1
                  </span>
                )}
              </button>

              {/* Nút Hỏi nhanh Chatbot (Icon nhỏ gọn nằm bên phải nút Thêm, có khoảng cách an toàn với viền card) */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAskAI?.(product);
                }}
                className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-600 hover:text-cyan-700 border border-cyan-300/80 transition-all flex items-center justify-center shadow-xs active:scale-95 shrink-0"
                title="Hỏi trợ lý AI BK-Bot về sản phẩm này"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};
