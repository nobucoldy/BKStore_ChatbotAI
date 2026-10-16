'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Lock, Mail, User as UserIcon, Phone, MapPin, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register';
  initialTab?: 'login' | 'register';
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'login',
  initialTab,
  onSuccess,
}) => {
  const activeInitial = initialTab || defaultTab;
  const [tab, setTab] = useState<'login' | 'register'>(activeInitial);

  React.useEffect(() => {
    if (isOpen) {
      setTab(initialTab || defaultTab);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, initialTab, defaultTab]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, register, authModalReason } = useAuthStore();
  const router = useRouter();

  if (!isOpen) return null;

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);
    try {
      await login({ email: demoEmail, password: demoPass });
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.role === 'admin') {
        setSuccessMsg(`Đăng nhập Admin thành công! Đang chuyển hướng...`);
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess();
          window.location.href = '/admin';
        }, 500);
      } else {
        setSuccessMsg(`Đăng nhập thành công với tài khoản ${demoEmail}!`);
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess();
          window.location.reload();
        }, 500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Đăng nhập không thành công.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      if (tab === 'login') {
        if (!email.trim() || !password.trim()) {
          throw new Error('Vui lòng nhập đầy đủ Email và Mật khẩu.');
        }
        await login({ email, password });
        const currentUser = useAuthStore.getState().user;
        if (currentUser?.role === 'admin') {
          setSuccessMsg('Đăng nhập Quản trị viên thành công! Đang chuyển sang trang Admin...');
          setTimeout(() => {
            onClose();
            if (onSuccess) onSuccess();
            window.location.href = '/admin';
          }, 500);
          return;
        } else {
          setSuccessMsg('Đăng nhập thành công!');
        }
      } else {
        if (!name.trim() || !email.trim() || !password.trim() || !phone.trim()) {
          throw new Error('Vui lòng điền đầy đủ Họ tên, Email, Số điện thoại và Mật khẩu.');
        }
        if (!/^0\d{9}$/.test(phone.trim())) {
          throw new Error('Số điện thoại không hợp lệ (cần 10 chữ số bắt đầu bằng 0).');
        }
        if (password.length < 6) {
          throw new Error('Mật khẩu tối thiểu 6 ký tự.');
        }
        await register({ name, email, password, phone, address });
        setSuccessMsg('Đăng ký tài khoản thành công!');
      }

      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
        window.location.reload();
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header gradient banner */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-6 pb-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
              <Lock className="w-5 h-5 text-cyan-300" />
            </span>
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-cyan-300">
              BK-Store Security
            </span>
          </div>
          <h3 className="text-xl font-bold">
            {tab === 'login' ? 'Đăng nhập tài khoản' : 'Tạo tài khoản mới'}
          </h3>
          <p className="text-xs text-slate-200 mt-1">
            {tab === 'login'
              ? 'Quản lý đơn hàng, theo dõi bảo hành và trải nghiệm trợ lý AI'
              : 'Gia nhập cộng đồng BK-Store để hưởng trọn vẹn đặc quyền'}
          </p>

          {/* Tab buttons */}
          <div className="flex bg-slate-950/40 p-1 rounded-xl mt-4 border border-white/10">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                tab === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                tab === 'register'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Đăng ký
            </button>
          </div>
        </div>

        {/* Reason banner if triggered by guest action */}
        {authModalReason && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5 shadow-2xs">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-semibold leading-relaxed">{authModalReason}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl leading-relaxed">
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {tab === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nguyễn Văn An"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Địa chỉ Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@bkstore.vn"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>
            </div>

            {tab === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mật khẩu <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>
            </div>

            {tab === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Địa chỉ giao hàng mặc định
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Số 18 Hoàng Quốc Việt, Cầu Giấy, Hà Nội"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] transition-all shadow-md shadow-blue-500/25 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <span>Đang xử lý...</span>
              ) : tab === 'login' ? (
                <>
                  <span>Đăng nhập ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Hoàn tất đăng ký</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials for Defense/Demo */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Đăng nhập nhanh cho Demo / Giảng viên</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('khachhang@bkstore.vn', '123456')}
                disabled={submitting}
                className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 text-left transition-all group cursor-pointer"
              >
                <div className="text-[11px] font-bold text-blue-900 group-hover:text-blue-700">
                  👤 Khách hàng Demo
                </div>
                <div className="text-[10px] text-slate-500 truncate">khachhang@bkstore.vn</div>
                <div className="text-[9px] text-blue-600 font-mono mt-0.5">Pass: 123456</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin@bkstore.vn', 'admin123')}
                disabled={submitting}
                className="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/80 text-left transition-all group cursor-pointer"
              >
                <div className="text-[11px] font-bold text-indigo-900 group-hover:text-indigo-700">
                  ⚙️ Quản trị viên (Admin)
                </div>
                <div className="text-[10px] text-slate-500 truncate">admin@bkstore.vn</div>
                <div className="text-[9px] text-indigo-600 font-mono mt-0.5">Pass: admin123</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
