'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  X,
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
} from 'lucide-react';
import { Order } from '@/types';
import { fetchMyOrdersApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface MyOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenReview?: (orderCode?: string, phone?: string) => void;
  onOpenTracking?: (orderCode: string, phone: string) => void;
}

export const MyOrdersModal: React.FC<MyOrdersModalProps> = ({
  isOpen,
  onClose,
  onOpenReview,
  onOpenTracking,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const user = useAuthStore((state) => state.user);

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
    if (isOpen) {
      loadOrders();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Giao thành công</span>
          </span>
        );
      case 'shipping':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            <span>Đang giao hàng</span>
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Đã duyệt kho</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <X className="w-3.5 h-3.5 text-rose-600" />
            <span>Đã hủy</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Chờ xử lý</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/30 text-cyan-300 border border-cyan-500/30">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Đơn hàng của tôi</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/20 text-cyan-300 border border-blue-400/30">
                  {orders.length} đơn
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Tài khoản: <strong className="text-white">{user?.name}</strong> • {user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={loadOrders}
              disabled={loading}
              title="Làm mới danh sách"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/60">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              ⚠️ {error}
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Đang tải lịch sử đơn hàng của bạn...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Chưa có đơn hàng nào</h4>
              <p className="text-xs text-slate-500 max-w-xs">
                Bạn chưa đặt mua sản phẩm nào tại BK-Store. Hãy khám phá các thiết bị công nghệ đỉnh cao ngay hôm nay!
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
              >
                Khám phá sản phẩm ngay
              </button>
            </div>
          ) : (
            orders.map((ord) => (
              <div
                key={ord.id || ord.orderCode}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3 hover:border-blue-300 transition-colors"
              >
                {/* Order Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                      {ord.orderCode}
                    </span>
                    <span className="text-slate-400 text-xs flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(ord.createdAt).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div>{getStatusBadge(ord.status)}</div>
                </div>

                {/* Warehouse info */}
                {ord.branchName && (
                  <div className="text-[11px] text-slate-600 flex items-center gap-1.5 bg-blue-50/60 text-blue-900 p-2 rounded-xl border border-blue-100">
                    <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>
                      Kho xuất hàng: <strong>{ord.branchName}</strong>
                    </span>
                  </div>
                )}

                {/* Items List */}
                <div className="space-y-2">
                  {ord.items && ord.items.map((item, idx) => (
                    <div
                      key={item.productId || idx}
                      className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50 last:border-none"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.productThumbnail ? (
                          <img
                            src={item.productThumbnail}
                            alt={item.productName}
                            className="w-10 h-10 object-cover rounded-lg bg-slate-100 shrink-0 border border-slate-100"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=200&q=80';
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate" title={item.productName}>
                            {item.productName}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Số lượng: {item.quantity} x {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(item.unitPrice || item.price || 0))}
                          </p>
                        </div>
                      </div>

                      <div className="font-bold text-slate-900 shrink-0 ml-2">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number((item.unitPrice || item.price || 0) * item.quantity))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tracking status note */}
                {ord.trackingInfo && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-700 leading-relaxed">
                    <span className="font-bold text-slate-900">Lộ trình vận chuyển:</span> {ord.trackingInfo}
                  </div>
                )}

                {/* Bottom Total & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="text-xs">
                    <span className="text-slate-500">Tổng thanh toán: </span>
                    <span className="font-bold text-sm text-blue-600">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(ord.totalAmount))}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1 font-mono">({ord.paymentMethod})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {onOpenTracking && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenTracking(ord.orderCode, ord.phone);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Truck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Tra cứu lộ trình</span>
                      </button>
                    )}
                    {ord.status === 'delivered' && onOpenReview && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenReview(ord.orderCode, ord.phone);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                        <span>Đánh giá sản phẩm</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
