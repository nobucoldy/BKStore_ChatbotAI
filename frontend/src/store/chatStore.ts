'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatMessage } from '@/types';

export const DEFAULT_WELCOME_MESSAGE: ChatMessage = {
  id: 'msg-welcome',
  role: 'assistant',
  content:
    'Xin chào! Tôi là **BK-Bot**, trợ lý AI kỹ thuật của BK-Store.\n\nTôi có thể giúp bạn:\n• 💻 **Tư vấn cấu hình** laptop, điện thoại theo nhu cầu & túi tiền\n• 🏢 **Kiểm tra tồn kho thực tế** tại 3 chi nhánh (Hà Nội, TP.HCM, Đà Nẵng)\n• 🚚 **Tra cứu vận đơn & tiến trình đơn hàng** theo mã đơn\n• ⭐ **Xem đánh giá thực tế & hướng dẫn đánh giá** đơn hàng đã giao\n• 📖 **Giải đáp chính sách** bảo hành 1 đổi 1 trong 30 ngày, đổi trả & trả góp\n\nBạn đang quan tâm đến sản phẩm hoặc cần hỗ trợ gì ạ?',
  timestamp: new Date().toISOString(),
};

interface ChatState {
  isOpen: boolean;
  messages: ChatMessage[];
  isTyping: boolean;
  initialPrompt?: string;
  hasHydrated: boolean;
  openChat: (prompt?: string) => void;
  closeChat: () => void;
  toggleChat: () => void;
  setIsOpen: (isOpen: boolean) => void;
  setMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  addMessage: (msg: ChatMessage) => void;
  setIsTyping: (isTyping: boolean) => void;
  setInitialPrompt: (prompt?: string) => void;
  clearHistory: () => void;
  setHasHydrated: (val: boolean) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      isOpen: false,
      messages: [DEFAULT_WELCOME_MESSAGE],
      isTyping: false,
      initialPrompt: undefined,
      hasHydrated: false,

      openChat: (prompt?: string) => {
        set({
          isOpen: true,
          ...(prompt ? { initialPrompt: prompt } : {}),
        });
      },
      closeChat: () => set({ isOpen: false }),
      toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),
      setIsOpen: (isOpen: boolean) => set({ isOpen }),
      setMessages: (updater) => {
        set((state) => ({
          messages: typeof updater === 'function' ? updater(state.messages) : updater,
        }));
      },
      addMessage: (msg: ChatMessage) => {
        set((state) => ({ messages: [...state.messages, msg] }));
      },
      setIsTyping: (isTyping: boolean) => set({ isTyping }),
      setInitialPrompt: (prompt?: string) => set({ initialPrompt: prompt }),
      clearHistory: () => {
        set({
          messages: [
            {
              id: `msg-welcome-${Date.now()}`,
              role: 'assistant',
              content:
                'Đã làm mới cuộc trò chuyện! Tôi là **BK-Bot**, trợ lý AI của BK-Store. Tôi có thể hỗ trợ gì cho bạn ngay bây giờ ạ?',
              timestamp: new Date().toISOString(),
            },
          ],
          initialPrompt: undefined,
        });
      },
      setHasHydrated: (val: boolean) => set({ hasHydrated: val }),
    }),
    {
      name: 'bkstore_chat_storage_v1',
      partialize: (state) => ({
        isOpen: state.isOpen,
        messages: state.messages,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
