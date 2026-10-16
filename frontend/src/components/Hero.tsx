'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, ShieldCheck, Zap, RotateCcw, Cpu, ArrowRight } from 'lucide-react';

interface HeroProps {
  onExploreClick: () => void;
  onOpenChat: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExploreClick, onOpenChat }) => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white py-12 md:py-16">
      {/* Background Glow Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none translate-y-1/3"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Heading & CTA */}
          <div className="lg:col-span-7 flex flex-col items-start gap-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>BK-Bot AI Engine 2.4 — Tư vấn thông số chuẩn xác</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
              Thương mại Công nghệ <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400">
                Đỉnh Cao & Trợ Lý AI BK-Bot
              </span>
            </h1>

            <p className="text-slate-300 text-base sm:text-lg max-w-xl leading-relaxed">
              Trải nghiệm mua sắm Laptop, Smartphone và Phụ kiện cao cấp chính hãng. 
              Hỏi đáp trực tiếp cùng trợ lý AI BK-Bot để so sánh benchmark, kiểm tra kho 3 chi nhánh và nhận đề xuất tối ưu ngân sách.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onExploreClick}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Khám phá sản phẩm
              </button>
              <button
                onClick={onOpenChat}
                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm border border-white/10 backdrop-blur-xs flex items-center gap-2 transition-all"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Tư vấn cấu hình với AI</span>
              </button>
            </div>

            {/* Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 w-full border-t border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>100% Chính Hãng</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Giao nhanh 2H</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <RotateCcw className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Đổi mới 30 ngày</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Cpu className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Hỗ trợ AI 24/7</span>
              </div>
            </div>
          </div>

          {/* Right Column: Featured Flagship Showcase Card linked to real product */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <Link
              href="/products/macbook-pro-14-m3-pro-18gb-512gb"
              className="w-full max-w-md bg-slate-800/80 border border-slate-700/80 hover:border-blue-500/70 rounded-2xl p-5 shadow-2xl backdrop-blur-md relative overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-blue-500/20 block"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  FLAGSHIP 2026
                </span>
                <span className="text-xs font-mono text-emerald-400">● Sẵn hàng tại 3 showroom</span>
              </div>

              {/* Product Visual */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900/90 mb-4 flex items-center justify-center">
                <img
                  src="https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800&q=80"
                  alt="Apple MacBook Pro 14 M3 Pro"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent"></div>
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-blue-400 block tracking-wider">Apple Flagship</span>
                    <h3 className="font-semibold text-white text-sm group-hover:text-blue-300 transition-colors">
                      MacBook Pro 14 inch M3 Pro
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-amber-400 font-mono font-bold text-sm block">49.990.000₫</span>
                    <span className="text-slate-400 line-through text-[10px]">53.990.000₫</span>
                  </div>
                </div>
              </div>

              {/* Quick AI Benchmark Card */}
              <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-700/60 text-xs flex flex-col gap-2">
                <div className="flex items-center justify-between text-slate-300 font-mono text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    AI Geekbench 6 Compute:
                  </span>
                  <span className="text-cyan-300 font-bold">148,500 pts</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full w-[92%] rounded-full"></div>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed italic">
                  &ldquo;Chip Apple M3 Pro 18GB RAM cân mượt Docker, biên dịch code hệ thống lớn và render đồ họa 3D chuyên sâu.&rdquo; — BK-Bot
                </p>
                <div className="mt-1 pt-2 border-t border-slate-700/60 flex items-center justify-between text-blue-400 group-hover:text-blue-300 text-xs font-medium">
                  <span>Khám phá chi tiết cấu hình & Mua ngay</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
};
