'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HeroProps {
  onExploreClick?: () => void;
  onOpenChat?: () => void;
}

interface BannerSlide {
  id: string;
  image: string;
  alt: string;
}

const BANNERS: BannerSlide[] = [
  {
    id: 'back-to-school',
    image: '/banners/banner-back-to-school.jpg',
    alt: 'BK-Store Back to School - Tựu trường đỉnh cao',
  },
  {
    id: 'flagship',
    image: '/banners/banner-flagship.jpg',
    alt: 'BK-Store Flagship - Công nghệ đỉnh cao',
  },
  {
    id: 'ai-bot',
    image: '/banners/banner-ai-bot.jpg',
    alt: 'Trợ lý tư vấn AI BK-Bot 24/7',
  },
];

export const Hero: React.FC<HeroProps> = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  // Auto-play timer
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % BANNERS.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [isPaused]);

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + BANNERS.length) % BANNERS.length);
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % BANNERS.length);
  };

  // Touch Swipe Handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;

    if (diff > 50) {
      handleNext();
    } else if (diff < -50) {
      handlePrev();
    }
    touchStartXRef.current = null;
  };

  return (
    <section className="relative w-full py-4 sm:py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* CAROUSEL WRAPPER (Clean light container, no black background) */}
        <div
          className="relative w-full group rounded-2xl md:rounded-3xl overflow-hidden border border-slate-200/90 shadow-xl shadow-slate-200/50 bg-white"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* BANNER SLIDES (Ultra-wide aspect ratio for a sleek compact banner height) */}
          <div className="relative aspect-[16/8] sm:aspect-[21/9.5] md:aspect-[2.35/1] w-full overflow-hidden select-none max-h-[360px] md:max-h-[380px]">
            {BANNERS.map((slide, index) => {
              const isActive = index === currentSlide;

              return (
                <div
                  key={slide.id}
                  className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${
                    isActive
                      ? 'opacity-100 z-10'
                      : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  <img
                    src={slide.image}
                    alt={slide.alt}
                    className="w-full h-full object-cover object-center"
                    draggable={false}
                  />
                </div>
              );
            })}
          </div>

          {/* ARROW BUTTONS (Nền kính mờ tinh tế) */}
          <button
            onClick={handlePrev}
            aria-label="Banner trước"
            className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/70 hover:bg-white text-slate-800 hover:text-blue-600 border border-slate-200/80 backdrop-blur-md flex items-center justify-center transition-all opacity-80 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer shadow-md active:scale-90"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <button
            onClick={handleNext}
            aria-label="Banner tiếp theo"
            className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/70 hover:bg-white text-slate-800 hover:text-blue-600 border border-slate-200/80 backdrop-blur-md flex items-center justify-center transition-all opacity-80 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer shadow-md active:scale-90"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* DOT INDICATORS (Nằm gọn ở giữa bên dưới) */}
          <div className="absolute bottom-2.5 sm:bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/20">
            {BANNERS.map((b, idx) => {
              const isSelected = idx === currentSlide;
              return (
                <button
                  key={b.id}
                  onClick={() => setCurrentSlide(idx)}
                  aria-label={`Chuyển đến banner ${idx + 1}`}
                  className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? 'w-6 sm:w-7 bg-white shadow-xs'
                      : 'w-1.5 sm:w-2 bg-white/50 hover:bg-white/80'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
