'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  ArrowRight,
  ShoppingBag,
  ExternalLink,
  PackageCheck,
  Building2,
  CheckCircle2,
  RotateCcw,
  Store,
  Eye,
  Star,
} from 'lucide-react';
import { ChatMessage, Product } from '@/types';
import { sendChatMessage, fetchProductBySlug } from '@/lib/api';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';

interface ChatWidgetProps {
  isOpen?: boolean;
  onToggle?: () => void;
  initialPrompt?: string;
}

function cleanAssistantMessage(text: string): string {
  if (!text) return '';
  return text
    .replace(/(?:^|\n)[\/\*_\s]*(?:technical\s*metadata|metadata\s*printed|self-check|checklist|internal\s*JSON\s*tags)[\s\S]*?(?=\n\n[A-ZÀ-Ỹ0-9]|$)/gi, '')
    .replace(/^.*(?:technical\s*metadata|suggest\s*next\s*step\s*at\s*end|checked\s*\(no|\(no\s*\[tài liệu|internal\s*JSON\s*tags).*$/gim, '')
    .replace(/\[Tài liệu:.*?\]/gi, '')
    .replace(/\[Mục:.*?\]/gi, '')
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      return (
        !/^(?:\/|\*|\-)?\s*(?:technical\s*metadata|suggest\s*next\s*step|checked\b)/i.test(trimmed) &&
        !/\bchecked\s*\(/i.test(trimmed) &&
        !/internal\s*(?:JSON|tags)/i.test(trimmed)
      );
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  isOpen: propIsOpen,
  onToggle: propOnToggle,
  initialPrompt: propInitialPrompt,
}) => {
  const storeIsOpen = useChatStore((state) => state.isOpen);
  const storeToggle = useChatStore((state) => state.toggleChat);
  const storeMessages = useChatStore((state) => state.messages);
  const setStoreMessages = useChatStore((state) => state.setMessages);
  const storeIsTyping = useChatStore((state) => state.isTyping);
  const setStoreIsTyping = useChatStore((state) => state.setIsTyping);
  const storeInitialPrompt = useChatStore((state) => state.initialPrompt);
  const setStoreInitialPrompt = useChatStore((state) => state.setInitialPrompt);
  const clearStoreHistory = useChatStore((state) => state.clearHistory);

  const isOpen = propIsOpen !== undefined ? propIsOpen : storeIsOpen;
  const onToggle = propOnToggle || storeToggle;
  const messages = storeMessages;
  const setMessages = setStoreMessages;
  const isTyping = storeIsTyping;
  const setIsTyping = setStoreIsTyping;

  const [input, setInput] = useState('');
  const [addedItemIds, setAddedItemIds] = useState<Record<string, boolean>>({});
  const [limitErrorItemIds, setLimitErrorItemIds] = useState<Record<string, string | undefined>>({});
  const [isStreaming, setIsStreaming] = useState(false);
  const isStreamingRef = useRef<boolean>(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);
  messagesRef.current = messages;
  const isTypingRef = useRef<boolean>(isTyping);
  isTypingRef.current = isTyping;
  const isBusy = isTyping || isStreaming;
  const lastPropPromptRef = useRef<string | undefined>(undefined);
  const addItem = useCartStore((state) => state.addItem);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const openAuthModal = useAuthStore((state) => state.openAuthModal);

  const quickPrompts = [
    'Tư vấn laptop 30-50 triệu',
    'Có bao nhiêu đơn hàng của tôi chưa được duyệt?',
    'Chính sách bảo hành của cửa hàng thế nào?',
  ];

  const handleAddToCart = (e: React.MouseEvent, prod: any) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      openAuthModal('Vui lòng đăng nhập tài khoản để thêm sản phẩm vào giỏ hàng.');
      return;
    }

    const productObj: Product = {
      id: prod.id,
      name: prod.name,
      slug: prod.slug,
      brand: prod.brand,
      price: Number(prod.price),
      originalPrice: prod.originalPrice ? Number(prod.originalPrice) : undefined,
      thumbnail: prod.thumbnail,
      images: prod.images || [prod.thumbnail],
      specs: prod.specs || {},
      description: prod.description || '',
      stock: prod.stockQuantity ?? prod.stock ?? 10,
    };

    const res = addItem(productObj, 1);
    if (res.success) {
      setAddedItemIds((prev) => ({ ...prev, [prod.id]: true }));
      setTimeout(() => {
        setAddedItemIds((prev) => ({ ...prev, [prod.id]: false }));
      }, 1500);
    } else if (res.message) {
      setLimitErrorItemIds((prev) => ({ ...prev, [prod.id]: 'Đã đạt tối đa trong giỏ' }));
      setTimeout(() => {
        setLimitErrorItemIds((prev) => ({ ...prev, [prod.id]: undefined }));
      }, 2500);
    }
  };

  const scrollToBottom = React.useCallback((smooth = true) => {
    if (messagesContainerRef.current) {
      if (smooth) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      } else {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  const handleSendPrompt = React.useCallback(
    async (text: string, force = false) => {
      if (!text.trim() || (!force && (isTypingRef.current || isStreamingRef.current))) return;

      const userMsg: ChatMessage = {
        id: `usr-${Date.now()}`,
        role: 'user',
        content: text.trim(),
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setIsTyping(true);

      // Build history for context using stable ref (đồng bộ 8 lượt hội thoại gần nhất)
      const historyPayload = messagesRef.current.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // If user is viewing a product detail page (/products/[slug]), inject page context so questions like "máy này bảo hành thế nào" know which product is being viewed
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/products/')) {
        const currentSlug = decodeURIComponent(
          window.location.pathname.replace(/^\/products\//, '').split('/')[0]
        );
        if (currentSlug) {
          historyPayload.unshift({
            role: 'user',
            content: `[Ngữ cảnh trang hiện tại: Khách hàng đang xem sản phẩm ${currentSlug}]`,
          });
        }
      }

      const startTime = performance.now();

      try {
        const responseData = await sendChatMessage({
          message: text.trim(),
          history: historyPayload,
        });

        // 1. Natural Thinking Delay (Labor illusion):
        // Giữ hiệu ứng đang soạn tin tối thiểu từ 550ms - 720ms để người dùng bắt nhịp tự nhiên
        const elapsed = performance.now() - startTime;
        const naturalThinkingDelay = 550 + Math.floor(Math.random() * 170); // 550ms - 720ms
        if (elapsed < naturalThinkingDelay) {
          await new Promise((resolve) => setTimeout(resolve, naturalThinkingDelay - elapsed));
        }

        const fullContent = cleanAssistantMessage(responseData.reply);
        const botMsgId = `ast-${Date.now()}`;
        const words = fullContent.split(' ');

        // Nếu câu trả lời quá ngắn (<= 3 từ), hiển thị luôn
        if (words.length <= 3) {
          const finalBotMsg: ChatMessage = {
            id: botMsgId,
            role: 'assistant',
            content: fullContent,
            cards: responseData.cards,
            citations: responseData.citations,
            suggestions: responseData.suggestions,
            toolUsed: responseData.toolUsed,
            metrics: responseData.metrics,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, finalBotMsg]);
          setIsTyping(false);
          return;
        }

        // 2. Progressive Typewriter Effect (Hiệu ứng đánh máy chữ mượt mà)
        isStreamingRef.current = true;
        setIsStreaming(true);
        setIsTyping(false); // Ẩn bong bóng 3 chấm khi chữ bắt đầu xuất hiện

        const CHUNK_STEP = 2; // Gõ 2 từ mỗi nhịp
        let cursor = CHUNK_STEP;
        const initialChunk = words.slice(0, cursor).join(' ');

        const initialBotMsg: ChatMessage = {
          id: botMsgId,
          role: 'assistant',
          content: initialChunk,
          citations: responseData.citations,
          toolUsed: responseData.toolUsed,
          metrics: responseData.metrics,
          timestamp: new Date().toISOString(),
          // Chưa bung thẻ sản phẩm và gợi ý khi đang gõ chữ
        };

        setMessages((prev) => [...prev, initialBotMsg]);

        while (cursor < words.length && isStreamingRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 24)); // 24ms mỗi nhịp gõ
          cursor = Math.min(cursor + CHUNK_STEP, words.length);
          const progressiveText = words.slice(0, cursor).join(' ');

          setMessages((prev) =>
            prev.map((m) => (m.id === botMsgId ? { ...m, content: progressiveText } : m))
          );
          scrollToBottom(false);
        }

        // 3. Hoàn tất gõ chữ: Bung toàn bộ nội dung hoàn chỉnh kèm Thẻ sản phẩm & Nút gợi ý
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId
              ? {
                  ...m,
                  content: fullContent,
                  cards: responseData.cards,
                  suggestions: responseData.suggestions,
                }
              : m
          )
        );
        scrollToBottom(true);
      } catch (err: any) {
        console.error('Lỗi khi gửi tin nhắn cho AI:', err);
        const errorMsg: ChatMessage = {
          id: `ast-${Date.now()}`,
          role: 'assistant',
          content:
            'Dạ, hiện tại kết nối đến hệ thống máy chủ BK-Store đang bận. Anh/chị có thể thử lại sau giây lát hoặc liên hệ hotline miễn phí **1800 6868** để được tư vấn viên hỗ trợ ngay ạ!',
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsTyping(false);
        setIsStreaming(false);
        isStreamingRef.current = false;
      }
    },
    [setMessages, setIsTyping, scrollToBottom]
  );

  const handleClearHistory = () => {
    lastPropPromptRef.current = undefined;
    isStreamingRef.current = false;
    setIsStreaming(false);
    clearStoreHistory();
  };

  useEffect(() => {
    return () => {
      isStreamingRef.current = false;
    };
  }, []);

  useEffect(() => {
    // 1. If propInitialPrompt changed from props
    if (
      propInitialPrompt &&
      propInitialPrompt.trim() &&
      propInitialPrompt !== lastPropPromptRef.current
    ) {
      lastPropPromptRef.current = propInitialPrompt;
      handleSendPrompt(propInitialPrompt, true);
      return;
    }

    // 2. If storeInitialPrompt was set by openChat(prompt)
    if (storeInitialPrompt && storeInitialPrompt.trim()) {
      const promptToSend = storeInitialPrompt;
      setStoreInitialPrompt(undefined);
      handleSendPrompt(promptToSend, true);
    }
  }, [propInitialPrompt, storeInitialPrompt, handleSendPrompt, setStoreInitialPrompt]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom(true);
    }
  }, [messages.length, isOpen, isTyping, scrollToBottom]);

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={onToggle}
        className={`fixed bottom-6 right-6 z-40 p-3.5 rounded-full shadow-xl flex items-center gap-2.5 transition-all duration-300 ${
          isOpen
            ? 'bg-slate-800 text-white hover:bg-slate-700'
            : 'bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 text-white hover:scale-105 shadow-blue-500/30 ring-4 ring-blue-500/20'
        }`}
        title="Trò chuyện cùng AI BK-Bot"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <>
            <div className="relative">
              <Sparkles className="w-6 h-6 text-cyan-300" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white animate-pulse"></span>
            </div>
            <span className="text-xs font-bold pr-1 hidden sm:inline tracking-wide">Hỏi BK-Bot AI</span>
          </>
        )}
      </button>

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-[88px] z-40 w-[calc(100vw-32px)] sm:w-[450px] h-[520px] sm:h-[calc(100vh-145px)] max-h-[760px] bg-white rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>BK-Bot Assistant</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live RAG & Tools
                  </span>
                </h3>
                <span className="text-[10px] text-slate-300">Tư vấn kỹ thuật • Tra cứu kho & Vận đơn 24/7</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleClearHistory}
                title="Làm mới cuộc trò chuyện"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onToggle}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs bg-slate-50/70">
            {messages.map((msg, idx) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Bot className="w-3.5 h-3.5 text-cyan-200" />
                  </div>
                )}

                <div className={`max-w-[88%] space-y-2.5`}>
                  {/* Text Bubble */}
                  <div
                    className={`rounded-2xl p-3.5 leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none shadow-sm whitespace-pre-wrap'
                        : 'bg-white border border-slate-200/90 text-slate-800 rounded-bl-none shadow-xs text-xs'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <>
                        <ReactMarkdown
                        components={{
                          h1: ({ children }) => (
                            <h1 className="text-sm font-bold text-slate-900 mt-2.5 mb-1.5 flex items-center gap-1.5">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-xs font-bold text-blue-900 mt-2 mb-1 pb-1 border-b border-slate-100 flex items-center gap-1">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-xs font-bold text-slate-900 mt-2 mb-1">
                              {children}
                            </h3>
                          ),
                          p: ({ children }) => (
                            <p className="mb-2 last:mb-0 leading-relaxed text-slate-700">
                              {children}
                            </p>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-semibold text-slate-900">
                              {children}
                            </strong>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc pl-4 space-y-1 my-1.5 text-slate-700 marker:text-blue-500">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal pl-4 space-y-1 my-1.5 text-slate-700 marker:text-blue-600 marker:font-semibold">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li className="leading-relaxed pl-0.5">
                              {children}
                            </li>
                          ),
                          code: ({ children }) => (
                            <code className="px-1.5 py-0.5 rounded bg-slate-100 text-blue-700 font-mono text-[11px] border border-slate-200/80">
                              {children}
                            </code>
                          ),
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-2 border-blue-500 pl-3 my-2 text-slate-600 italic bg-blue-50/50 py-1 rounded-r">
                              {children}
                            </blockquote>
                          ),
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 underline font-medium"
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                      {isStreaming && idx === messages.length - 1 && msg.role === 'assistant' && (
                        <span className="inline-block w-1.5 h-3 bg-blue-500 ml-1 animate-pulse rounded-xs align-middle" />
                      )}
                    </>
                    )}
                  </div>

                  {/* INTERACTIVE CARDS */}
                  {/* 1. PRODUCT CARDS */}
                  {msg.cards?.type === 'products' && Array.isArray(msg.cards.data) && msg.cards.data.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-blue-500" />
                        <span>Sản phẩm gợi ý từ hệ thống</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {msg.cards.data.map((prod: any) => (
                          <Link
                            key={prod.id}
                            href={`/products/${prod.slug}`}
                            className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-xs hover:border-blue-400 hover:shadow-md transition-all flex gap-3 items-center group cursor-pointer"
                          >
                            <img
                              src={prod.thumbnail}
                              alt={prod.name}
                              className="w-16 h-16 object-cover rounded-lg bg-slate-100 shrink-0 border border-slate-100 group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=200&q=80';
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">
                                {prod.brand}
                              </span>
                              <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors" title={prod.name}>
                                {prod.name}
                              </h4>
                              {prod.specsSummary && (
                                <p className="text-[10px] text-slate-500 truncate">{prod.specsSummary}</p>
                              )}
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-xs font-bold text-blue-600">
                                  {prod.formattedPrice ||
                                    new Intl.NumberFormat('vi-VN', {
                                      style: 'currency',
                                      currency: 'VND',
                                    }).format(Number(prod.price))}
                                </span>
                                {prod.discountPercent && (
                                  <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1 py-0.2 rounded">
                                    -{prod.discountPercent}%
                                  </span>
                                )}
                                {prod.stock === 1 || prod.stockQuantity === 1 ? (
                                  <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1 py-0.2 rounded animate-pulse">
                                    🔥 Còn 1
                                  </span>
                                ) : (prod.stock && prod.stock <= 10) || (prod.stockQuantity && prod.stockQuantity <= 10) ? (
                                  <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded">
                                    ⚡ Còn {prod.stock || prod.stockQuantity}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 shrink-0 relative">
                              {limitErrorItemIds[prod.id] && (
                                <span className="absolute -top-6 right-0 text-[9px] font-sans font-semibold bg-slate-900 text-white px-1.5 py-0.5 rounded shadow z-30 whitespace-nowrap">
                                  {limitErrorItemIds[prod.id]}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleAddToCart(e, prod);
                                }}
                                className={`p-1.5 rounded-lg text-[10px] font-medium flex items-center justify-center transition-all ${
                                  addedItemIds[prod.id]
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white'
                                }`}
                                title="Thêm vào giỏ hàng"
                              >
                                {addedItemIds[prod.id] ? (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : (
                                  <ShoppingBag className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <span
                                className="p-1.5 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 text-[10px] flex items-center justify-center transition-colors pointer-events-none"
                                title="Xem chi tiết sản phẩm"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. ORDER TRACKING CARD */}
                  {msg.cards?.type === 'order' && msg.cards.data && (
                    <div className="bg-white border border-blue-200 rounded-xl p-3 shadow-xs space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <PackageCheck className={`w-4 h-4 shrink-0 ${msg.cards.data.isAskingUnconfirmedOrders ? 'text-amber-600' : 'text-blue-600'}`} />
                          <span className="font-bold text-slate-900 truncate">
                            {msg.cards.data.isUserOrderSummary
                              ? msg.cards.data.isAskingUnconfirmedOrders
                                ? `Đơn hàng chưa duyệt (${msg.cards.data.unconfirmedCount}/${msg.cards.data.userOrdersCount})`
                                : `Lịch sử đơn hàng (${msg.cards.data.userOrdersCount} đơn)`
                              : msg.cards.data.orderCode}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          msg.cards.data.isAskingUnconfirmedOrders
                            ? msg.cards.data.unconfirmedCount > 0
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {msg.cards.data.isAskingUnconfirmedOrders
                            ? msg.cards.data.unconfirmedCount > 0
                              ? `Chờ duyệt: ${msg.cards.data.unconfirmedCount} đơn`
                              : '0 đơn chờ duyệt'
                            : msg.cards.data.statusLabel}
                        </span>
                      </div>
                      <div className="text-[11px] space-y-1.5 text-slate-600">
                        <div className="flex justify-between">
                          <span>Khách hàng:</span>
                          <span className="font-semibold text-slate-800">{msg.cards.data.customerName || 'Quý khách'}</span>
                        </div>

                        {/* List of pending orders if user asked about unconfirmed */}
                        {msg.cards.data.isAskingUnconfirmedOrders && msg.cards.data.pendingOrders && msg.cards.data.pendingOrders.length > 0 ? (
                          <div className="space-y-1.5 pt-1 max-h-56 overflow-y-auto pr-1">
                            {msg.cards.data.pendingOrders.map((pOrd: any, pIdx: number) => (
                              <div key={pIdx} className="p-2 rounded-lg bg-amber-50/70 border border-amber-200/80 text-[10px] space-y-0.5">
                                <div className="flex justify-between font-bold">
                                  <span className="text-amber-900 font-mono">{pOrd.orderCode}</span>
                                  <span className="text-amber-800">{pOrd.formattedTotal}</span>
                                </div>
                                <div className="text-slate-600 truncate">{pOrd.itemsSummary}</div>
                                <div className="flex justify-between text-slate-500 text-[9px]">
                                  <span>{pOrd.branchName}</span>
                                  <span className="font-semibold text-amber-700">Chờ duyệt đơn</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : msg.cards.data.isAskingUnconfirmedOrders && msg.cards.data.unconfirmedCount === 0 ? (
                          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 text-[10px] font-semibold flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Tất cả các đơn hàng của bạn đều đã được duyệt & đang xử lý!</span>
                          </div>
                        ) : (
                          <>
                            {msg.cards.data.itemsSummary && (
                              <div className="flex justify-between items-start gap-2">
                                <span className="shrink-0">Sản phẩm:</span>
                                <span className="font-semibold text-slate-800 text-right truncate max-w-[200px]" title={msg.cards.data.itemsSummary}>
                                  {msg.cards.data.itemsSummary}
                                </span>
                              </div>
                            )}
                            {msg.cards.data.branchName && (
                              <div className="flex justify-between">
                                <span>Kho xuất hàng:</span>
                                <span className="font-bold text-blue-700">{msg.cards.data.branchName}</span>
                              </div>
                            )}
                            {msg.cards.data.formattedTotal && (
                              <div className="flex justify-between">
                                <span>Tổng tiền:</span>
                                <span className="font-bold text-blue-600">{msg.cards.data.formattedTotal}</span>
                              </div>
                            )}
                            {msg.cards.data.trackingInfo && (
                              <div className="bg-slate-50 p-2 rounded-lg text-[10px] text-slate-700 mt-1 border border-slate-100">
                                <span className="font-semibold">Lộ trình:</span> {msg.cards.data.trackingInfo}
                              </div>
                            )}
                          </>
                        )}

                        {msg.cards.data.canReview && (
                          <div className="bg-amber-50 border border-amber-200/80 p-2 rounded-lg text-[10px] text-amber-900 flex items-center justify-between mt-1">
                            <span className="flex items-center gap-1 font-semibold">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" /> Đủ điều kiện đánh giá sản phẩm (Verified)
                            </span>
                          </div>
                        )}

                        {/* Đường dẫn mở trang "Đơn hàng của tôi" */}
                        <Link
                          href="/orders"
                          className="flex items-center justify-between gap-1.5 w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold border border-blue-200/90 transition-all mt-2.5 shadow-2xs group"
                        >
                          <div className="flex items-center gap-1.5">
                            <PackageCheck className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
                            <span>
                              {msg.cards.data.isUserOrderSummary
                                ? 'Xem tất cả tại mục "Đơn hàng của tôi"'
                                : 'Mở chi tiết tại mục "Đơn hàng của tôi"'}
                            </span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* 3. INVENTORY STOCK CARD */}
                  {msg.cards?.type === 'inventory' && msg.cards.data && (
                    <div className="bg-white border border-emerald-200 rounded-xl p-3 shadow-xs space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <Store className="w-4 h-4 text-emerald-600" />
                          <span className="font-bold text-slate-900 truncate max-w-[180px]">
                            {msg.cards.data.product?.name}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Tổng kho: {msg.cards.data.totalStock} sản phẩm
                        </span>
                      </div>
                      <div className="space-y-1.5 pt-0.5">
                        {msg.cards.data.branches?.map((b: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-[10px] p-1.5 rounded-lg bg-slate-50 border border-slate-100"
                          >
                            <div>
                              <p className="font-semibold text-slate-800">{b.branchName}</p>
                              <p className="text-slate-500 text-[9px] truncate max-w-[180px]">{b.address}</p>
                            </div>
                            <span
                              className={`px-1.5 py-0.5 rounded font-bold ${
                                b.status === 'Còn hàng'
                                    ? 'bg-emerald-100 text-emerald-800'
                                  : b.status === 'Sắp hết hàng'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {b.status} ({b.quantity})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. PRODUCT REVIEWS CARD */}
                  {msg.cards?.type === 'reviews' && msg.cards.data && (
                    <div className="bg-white border border-amber-200/90 rounded-xl p-3 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between pb-2 border-b border-amber-100">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1 rounded-md bg-amber-50 text-amber-600 shrink-0">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-bold text-xs text-slate-900 truncate" title={msg.cards.data.product?.name}>
                              {msg.cards.data.product?.name || 'Đánh giá sản phẩm'}
                            </h5>
                            <span className="text-[10px] text-slate-500">
                              {msg.cards.data.totalReviews} lượt đánh giá thực tế từ người mua
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <span className="text-xs font-bold">{msg.cards.data.averageRating}</span>
                          <span className="text-[10px] text-amber-600">/ 5</span>
                        </div>
                      </div>

                      {/* Customer quotes */}
                      {Array.isArray(msg.cards.data.reviews) && msg.cards.data.reviews.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Nhận xét từ khách đã mua
                          </div>
                          {msg.cards.data.reviews.slice(0, 2).map((rev: any, idx: number) => (
                            <div
                              key={rev.id || idx}
                              className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-800 text-[10px]">
                                  {rev.customerName || 'Khách hàng'}
                                </span>
                                <div className="flex items-center gap-0.5">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-2.5 h-2.5 ${
                                        i < rev.rating
                                          ? 'fill-amber-400 text-amber-500'
                                          : 'fill-slate-200 text-slate-200'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-slate-600 text-[10px] italic line-clamp-2">
                                "{rev.comment}"
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Link to product detail page */}
                      {msg.cards.data.product?.slug && (
                        <Link
                          href={`/products/${msg.cards.data.product.slug}#reviews`}
                          className="w-full py-1.5 px-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                        >
                          <span>Xem chi tiết đánh giá & Viết nhận xét</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  )}

                  {/* 4.5. QUICK SUGGESTION / CLARIFICATION CHIPS */}
                  {msg.role === 'assistant' && Array.isArray(msg.suggestions) && msg.suggestions.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1.5 animate-in fade-in">
                      {msg.suggestions.map((suggestion, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => handleSendPrompt(suggestion)}
                          disabled={isBusy}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-blue-50/90 hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-200 transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer disabled:opacity-50 text-left"
                        >
                          💬 {suggestion}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 5. REAL-TIME PERFORMANCE TELEMETRY BADGE */}
                  {msg.role === 'assistant' && msg.metrics && (
                    <div
                      className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 pt-0.5 select-none"
                      title={`Chi tiết hiệu năng (Stage Latency):\n• Phân tích Intent (NLU): ${msg.metrics.intentDetectionMs} ms\n• Thực thi AI Tool (DB): ${msg.metrics.toolExecutionMs} ms\n• Truy vấn Vector RAG (${msg.metrics.ragChunksEvaluated} chunks): ${msg.metrics.ragRetrievalMs} ms\n• Sinh phản hồi (NLG/LLM): ${msg.metrics.llmGenerationMs} ms\n• Tổng thời gian phản hồi: ${msg.metrics.totalResponseTimeMs} ms`}
                    >
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-mono font-semibold">
                        ⚡ {msg.metrics.totalResponseTimeMs} ms
                      </span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/80 font-mono">
                        Intent: {msg.metrics.detectedIntent}
                      </span>
                      {msg.toolUsed && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80 font-mono">
                          Tool: {msg.toolUsed} ({msg.metrics.toolExecutionMs}ms)
                        </span>
                      )}
                      {msg.metrics.topRagScore > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-mono">
                          RAG Score: {msg.metrics.topRagScore} ({msg.metrics.ragRetrievalMs}ms)
                        </span>
                      )}
                    </div>
                  )}

                </div>

                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-slate-500 text-xs italic bg-white p-2.5 rounded-xl border border-slate-200/60 w-fit">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce delay-100"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce delay-200"></div>
                </div>
                <span className="text-[11px]">BK-Bot đang soạn tin nhắn...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="p-2 border-t border-slate-100 bg-white flex gap-1.5 overflow-x-auto scrollbar-none">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendPrompt(p)}
                disabled={isBusy}
                className="shrink-0 px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-full border border-slate-200 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                <span>{p}</span>
                <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendPrompt(input);
            }}
            className="p-3 border-t border-slate-200/90 bg-white flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isBusy}
              placeholder="Hỏi về sản phẩm, tồn kho hoặc đơn hàng của bạn..."
              className="flex-1 bg-slate-100 text-xs text-slate-800 rounded-xl px-3 py-2.5 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 border border-transparent focus:border-blue-400 transition-all disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || isBusy}
              className="p-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 text-white rounded-xl shadow-xs transition-all flex items-center justify-center shrink-0"
              title="Gửi câu hỏi"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
