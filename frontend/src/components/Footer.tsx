'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Truck, Headphones, RotateCcw, Sparkles } from 'lucide-react';

interface FooterProps {
  onOpenTracking?: () => void;
  onOpenReview?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenTracking, onOpenReview }) => {

  return (
    <footer className="bg-slate-950 text-slate-400 text-xs border-t border-slate-800 mt-16">
      {/* Service Highlights Bar */}
      <div className="border-b border-slate-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-sm">Chính Hãng 100%</h4>
                <p className="text-[11px] text-slate-500">Đầy đủ VAT & bảo hành</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-sm">Đổi Mới 30 Ngày</h4>
                <p className="text-[11px] text-slate-500">Lỗi nhà sản xuất đổi ngay</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-sm">Giao Hàng Miễn Phí</h4>
                <p className="text-[11px] text-slate-500">Cho đơn hàng từ 1.000.000₫</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-sm">Hỗ Trợ Kỹ Thuật 24/7</h4>
                <p className="text-[11px] text-slate-500">Hotline & Trợ lý AI BK-Bot</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Col 1: About BK-Store */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo-bkstore.png"
                alt="BK-Store Logo"
                className="w-9 h-9 rounded-xl object-contain bg-white/10 p-0.5"
              />
              <div className="flex flex-col">
                <span className="text-base font-extrabold text-white">BK-STORE</span>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  Smart Tech Commerce
                </span>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              Nền tảng thương mại điện tử chuyên cung cấp thiết bị công nghệ cao cấp chính hãng (Laptop, Smartphone, Phụ kiện Hi-End) tích hợp trợ lý AI thông minh tư vấn cấu hình và tra cứu vận đơn.
            </p>
            <div className="pt-2 text-[11px] text-slate-500 space-y-1 font-mono">
              <p>• Đồ án liên ngành CNTT</p>
              <p>• GVHD: ThS. Thầy Nguyễn Văn Sơn</p>
              <p>• SV: Nguyễn Quế Bắc & Hoàng Tuấn Kiệt</p>
            </div>
          </div>

          {/* Col 2: Cam kết & Trợ lý AI */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Công nghệ & Trải nghiệm mua sắm
            </h4>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs">
                <Sparkles className="w-4 h-4" />
                <span>Trợ lý ảo AI BK-Bot</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Tự động hóa tư vấn so sánh benchmark, kiểm tra thông số kỹ thuật và hỗ trợ khách hàng 24/7 không cần chờ đợi.
              </p>
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Hệ thống vận hành liên tục</span>
              </div>
            </div>
          </div>

          {/* Col 3: Quick Links & Tracking */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Dịch vụ & Hỗ trợ
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/orders"
                  className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
                >
                  <span>Lịch sử & Tiến trình đơn hàng</span>
                </Link>
              </li>
              {onOpenReview && (
                <li>
                  <button
                    onClick={onOpenReview}
                    className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
                  >
                    <span>⭐ Đánh giá sản phẩm đã mua</span>
                  </button>
                </li>
              )}

              <li><a href="#" className="hover:text-slate-200 transition-colors">Chính sách bảo hành 12-24 tháng</a></li>
              <li><a href="#" className="hover:text-slate-200 transition-colors">Chính sách giao hàng siêu tốc</a></li>
              <li><a href="#" className="hover:text-slate-200 transition-colors">Hướng dẫn thanh toán VietQR</a></li>
              <li><a href="#" className="hover:text-slate-200 transition-colors">Quy định bảo mật NFR-03</a></li>
              <li>
                <a href="/admin" className="text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-1 font-mono">
                  <span>⚙ Quản trị Hệ thống (Admin Portal)</span>
                </a>
              </li>
            </ul>

            <div className="pt-3 border-t border-slate-800">
              <div className="text-xs font-semibold text-slate-300">Tổng đài hỗ trợ:</div>
              <div className="text-lg font-mono font-bold text-blue-400 mt-0.5">1800 6868</div>
              <div className="text-[11px] text-slate-500">(Miễn phí cuộc gọi, 8h00 - 21h30)</div>
            </div>
          </div>

        </div>

        {/* Brand Directory Strip */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
            Hệ sinh thái thương hiệu:
          </span>
          {['Apple', 'Dell', 'Asus', 'Samsung', 'Sony', 'Keychron', 'Anker'].map((b) => (
            <Link
              key={b}
              href={`/brands/${b.toLowerCase()}`}
              className="text-slate-400 hover:text-cyan-400 transition-colors font-medium flex items-center gap-1"
            >
              <span>{b}</span>
            </Link>
          ))}
        </div>

        {/* Bottom copyright */}
        <div className="mt-6 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© 2026 BK-Store. Dự án nghiên cứu & ứng dụng AI Agent trong Thương mại điện tử.</p>
          <p className="font-mono">Engine: Next.js 16 • PostgreSQL PGVector • LangChain</p>
        </div>
      </div>
    </footer>
  );
};
