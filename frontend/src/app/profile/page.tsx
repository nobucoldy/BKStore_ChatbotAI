'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertCircle,
  Package,
  ArrowLeft,
  Calendar,
  Lock,
  LogOut,
  Sparkles,
  Layers,
  ChevronRight,
  Shield,
  RotateCcw,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AuthModal } from '@/components/AuthModal';
import { ReviewModal } from '@/components/ReviewModal';
import { useAuthStore } from '@/store/authStore';
import { updateProfileApi } from '@/lib/api';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, updateUser, logout } = useAuthStore();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name || user.fullName || '');
      setPhone(user.phone || '');
      setAddress(user.address || '');
    }
  }, [user]);

  const handleReset = () => {
    if (user) {
      setName(user.name || user.fullName || '');
      setPhone(user.phone || '');
      setAddress(user.address || '');
      setErrorMsg('');
      setSuccessMsg('');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!name.trim() || name.trim().length < 2) {
      setErrorMsg('Họ và tên người nhận tối thiểu 2 ký tự.');
      return;
    }

    if (phone.trim() && !/^0\d{9}$/.test(phone.trim())) {
      setErrorMsg('Số điện thoại không hợp lệ (yêu cầu 10 chữ số bắt đầu bằng 0).');
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateProfileApi({
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      });

      if (res.success && res.data) {
        updateUser(res.data);
        setSuccessMsg('Đã lưu thông tin cá nhân và sổ địa chỉ nhận hàng thành công!');
        setTimeout(() => setSuccessMsg(''), 4500);
      } else {
        setErrorMsg(res.error || 'Không thể lưu thay đổi. Vui lòng thử lại.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* 1. Sticky Header */}
      <Header
        onOpenCart={() => router.push('/#catalog-section')}
        onOpenTracking={() => router.push('/orders')}
        onOpenReview={() => setIsReviewOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* 2. Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại trang mua sắm</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span>BK-Store</span>
            <span>/</span>
            <span className="text-slate-700 font-semibold">Tài khoản</span>
          </div>
        </div>

        {/* Not authenticated state */}
        {!isLoading && !isAuthenticated ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8 sm:p-14 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4 border border-blue-100 shadow-xs">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Vui lòng đăng nhập</h2>
            <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
              Bạn cần đăng nhập tài khoản BK-Store để xem và cập nhật hồ sơ cá nhân, địa chỉ giao hàng mặc định và quản lý đơn hàng.
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
          /* Two-Column Responsive Dashboard */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT SIDEBAR (Span 4) */}
            <div className="lg:col-span-4 space-y-6">
              {/* User Identity Card */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 text-center relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 opacity-90" />

                {/* Big Circular Avatar with White Border */}
                <div className="relative mt-4 mb-3 flex justify-center">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-700 via-indigo-700 to-cyan-500 text-white flex items-center justify-center text-4xl font-black shadow-lg shadow-blue-500/30 border-4 border-white">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                </div>

                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  {user?.name || user?.fullName}
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">{user?.email}</p>

                {/* Role Badge */}
                <div className="mt-3 flex justify-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>{user?.role === 'admin' ? '⚙️ Quản trị viên' : '👤 Khách hàng thân thiết'}</span>
                  </span>
                </div>

                {/* Account Details footer */}
                <div className="mt-5 pt-4 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    Thành viên từ{' '}
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString('vi-VN', {
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'Tháng 9/2026'}
                  </span>
                </div>
              </div>

              {/* Sidebar Navigation Menu */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-3 space-y-1">
                <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Điều hướng tài khoản
                </div>

                <div className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-blue-50/80 text-blue-700 text-xs font-bold border border-blue-100">
                  <div className="flex items-center gap-2.5">
                    <UserIcon className="w-4 h-4 text-blue-600" />
                    <span>Thông tin cá nhân</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                </div>

                <Link
                  href="/orders"
                  className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-slate-600 hover:text-blue-600 hover:bg-slate-50 text-xs font-semibold transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <Package className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    <span>Đơn hàng của tôi</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                {user?.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 text-xs font-semibold transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Layers className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                      <span>Trang Quản trị Admin</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => {
                    logout();
                    router.push('/');
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-all group cursor-pointer pt-2 border-t border-slate-100 mt-1"
                >
                  <div className="flex items-center gap-2.5">
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Đăng xuất</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

            {/* RIGHT MAIN CONTENT (Span 8) */}
            <div className="lg:col-span-8 space-y-6">
              <form onSubmit={handleSave} className="space-y-6">
                {/* Notification messages */}
                {successMsg && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-medium">{successMsg}</span>
                  </div>
                )}

                {errorMsg && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="font-medium">{errorMsg}</span>
                  </div>
                )}

                {/* Card 1: Basic Profile Details */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 sm:p-7">
                  <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">1. Thông tin tài khoản</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Tên đại diện và địa chỉ thư điện tử xác thực trên hệ thống BK-Store.
                      </p>
                    </div>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      <Shield className="w-3 h-3 text-emerald-600" />
                      Đã xác thực
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                        <span>Họ và tên <span className="text-rose-500">*</span></span>
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nguyễn Văn An"
                        className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>Email tài khoản</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal">Cố định</span>
                      </label>
                      <input
                        type="email"
                        disabled
                        value={user?.email || ''}
                        className="w-full text-sm font-mono px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Card 2: Delivery & Shipping Address */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 sm:p-7">
                  <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">2. Sổ địa chỉ & Nhận hàng mặc định</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Địa chỉ và số điện thoại dùng để nhận máy, hóa đơn và bảo hành.
                      </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                      <Sparkles className="w-3 h-3 text-blue-600" />
                      Tự động điền khi mua hàng
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-blue-600" />
                          <span>Số điện thoại giao hàng <span className="text-rose-500">*</span></span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">10 số (bắt đầu bằng 0)</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0912345678"
                        className="w-full text-sm font-mono px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Shipper sẽ liên hệ theo số này khi giao hàng đến nơi.
                      </p>
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        <span>Địa chỉ nhận hàng chi tiết <span className="text-rose-500">*</span></span>
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                        className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none"
                      />
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Cung cấp địa chỉ rõ ràng giúp đơn hàng của bạn được giao nhanh chóng và chính xác.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card 3: Security & Encryption */}
                <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 sm:p-7">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-slate-500" />
                      <h3 className="text-base font-bold text-slate-900">3. Bảo mật & Mã hóa</h3>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">Bcrypt • JWT</span>
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
                    <div>
                      <div className="font-semibold text-slate-800">Mật khẩu đăng nhập</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        •••••••••••••••• (Đã được mã hóa tiêu chuẩn NFR-03)
                      </div>
                    </div>
                    <span className="inline-block text-[10px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg w-fit">
                      Bảo vệ 24/7
                    </span>
                  </div>
                </div>

                {/* Action Buttons Bar */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={isSaving}
                    className="py-2.5 px-5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Đặt lại ban đầu</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-md shadow-blue-500/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isSaving ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>Lưu thông tin cá nhân</span>
                  </button>
                </div>
              </form>
            </div>
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
      />
    </div>
  );
}
