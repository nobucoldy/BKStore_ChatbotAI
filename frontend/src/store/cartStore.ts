import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CartItem, Product } from '@/types';
import { useAuthStore } from './authStore';

export interface AddItemResult {
  success: boolean;
  message?: string;
  addedQuantity: number;
}

export interface UpdateQuantityResult {
  success: boolean;
  message?: string;
  clamped?: boolean;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => AddItemResult;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => UpdateQuantityResult;
  toggleSelectItem: (productId: string) => void;
  setItemSelected: (productId: string, selected: boolean) => void;
  selectAllItems: (selected: boolean) => void;
  selectOnlyItem: (productId: string) => void;
  removeSelectedItems: () => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getSelectedItems: () => CartItem[];
  getSelectedTotalPrice: () => number;
  getSelectedTotalItems: () => number;
  getItemQuantity: (productId: string) => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product: Product, quantity = 1): AddItemResult => {
        const { isAuthenticated, openAuthModal } = useAuthStore.getState();
        if (!isAuthenticated) {
          openAuthModal('Vui lòng đăng nhập tài khoản để thêm sản phẩm vào giỏ hàng.');
          return {
            success: false,
            message: 'Khách vãng lai cần đăng nhập tài khoản để thêm sản phẩm vào giỏ hàng.',
            addedQuantity: 0,
          };
        }

        const maxStock = product.stock ?? product.stock_quantity ?? 0;

        if (maxStock <= 0) {
          return {
            success: false,
            message: 'Sản phẩm hiện đã hết hàng trong kho.',
            addedQuantity: 0,
          };
        }

        const state = get();
        const existingItemIndex = state.items.findIndex(
          (item) => item.product.id === product.id
        );
        const currentQty = existingItemIndex > -1 ? state.items[existingItemIndex].quantity : 0;

        if (currentQty >= maxStock) {
          return {
            success: false,
            message: `Bạn đã có ${currentQty} máy trong giỏ hàng (đã đạt giới hạn tồn kho ${maxStock} máy).`,
            addedQuantity: 0,
          };
        }

        const availableToAdd = maxStock - currentQty;
        const actualAdd = Math.min(quantity, availableToAdd);
        const isClamped = quantity > availableToAdd;

        set((s) => {
          if (existingItemIndex > -1) {
            const updatedItems = [...s.items];
            updatedItems[existingItemIndex] = {
              ...updatedItems[existingItemIndex],
              quantity: currentQty + actualAdd,
              selected: true,
            };
            return { items: updatedItems };
          }
          return { items: [...s.items, { product, quantity: actualAdd, selected: true }] };
        });

        if (isClamped) {
          return {
            success: true,
            message: `Chỉ còn ${maxStock} máy trong kho. Đã thêm tối đa ${actualAdd} máy vào giỏ hàng.`,
            addedQuantity: actualAdd,
          };
        }

        return {
          success: true,
          addedQuantity: actualAdd,
        };
      },

      removeItem: (productId: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.product.id !== productId),
        }));
      },

      updateQuantity: (productId: string, quantity: number): UpdateQuantityResult => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return { success: true };
        }

        const state = get();
        const targetItem = state.items.find((i) => i.product.id === productId);
        if (!targetItem) {
          return { success: false, message: 'Sản phẩm không có trong giỏ hàng.' };
        }

        const maxStock = targetItem.product.stock ?? targetItem.product.stock_quantity ?? 0;

        if (quantity > maxStock) {
          set((s) => ({
            items: s.items.map((item) =>
              item.product.id === productId ? { ...item, quantity: maxStock } : item
            ),
          }));
          return {
            success: false,
            clamped: true,
            message: `Số lượng yêu cầu (${quantity}) vượt quá tồn kho (${maxStock} máy). Hệ thống đã tự động điều chỉnh về ${maxStock}.`,
          };
        }

        set((s) => ({
          items: s.items.map((item) =>
            item.product.id === productId ? { ...item, quantity } : item
          ),
        }));

        return { success: true };
      },

      toggleSelectItem: (productId: string) => {
        set((state) => ({
          items: state.items.map((item) => {
            if (item.product.id === productId) {
              const currentSelected = item.selected !== false;
              return { ...item, selected: !currentSelected };
            }
            return item;
          }),
        }));
      },

      setItemSelected: (productId: string, selected: boolean) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.product.id === productId ? { ...item, selected } : item
          ),
        }));
      },

      selectAllItems: (selected: boolean) => {
        set((state) => ({
          items: state.items.map((item) => ({ ...item, selected })),
        }));
      },

      selectOnlyItem: (productId: string) => {
        set((state) => ({
          items: state.items.map((item) => ({
            ...item,
            selected: item.product.id === productId,
          })),
        }));
      },

      removeSelectedItems: () => {
        set((state) => ({
          items: state.items.filter((item) => item.selected === false),
        }));
      },

      clearCart: () => set({ items: [] }),

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + item.product.price * item.quantity,
          0
        );
      },

      getSelectedItems: () => {
        return get().items.filter((item) => item.selected !== false);
      },

      getSelectedTotalPrice: () => {
        return get()
          .getSelectedItems()
          .reduce(
            (total, item) => total + item.product.price * item.quantity,
            0
          );
      },

      getSelectedTotalItems: () => {
        return get()
          .getSelectedItems()
          .reduce((total, item) => total + item.quantity, 0);
      },

      getItemQuantity: (productId: string) => {
        const item = get().items.find((i) => i.product.id === productId);
        return item ? item.quantity : 0;
      },
    }),
    {
      name: 'bkstore-cart-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
