'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  X,
  CheckCircle,
  Copy,
  Check,
  CreditCard,
  Banknote,
  ShieldAlert,
  ArrowRight,
  Warehouse,
  MapPin,
  Lock,
  LogIn,
  UserCheck,
  ShoppingBag,
  Package,
  Clock,
  Truck,
  Sparkles,
  ShieldCheck,
  QrCode,
  AlertCircle,
  XCircle,
  ArrowLeft,
} from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/lib/utils';
import {
  createOrderApi,
  fetchInventoryOverview,
  fetchMyOrdersApi,
  updateOrderStatusApi,
} from '@/lib/api';
import { Order, Branch, Product, ProductInventoryItem, CartItem } from '@/types';

const DEFAULT_BRANCHES: Branch[] = [
  {
    id: 'b1000000-0000-0000-0000-000000000001',
    name: 'BK-Store Cầu Giấy (Hà Nội)',
    city: 'Hà Nội',
    address: '268 Cầu Giấy, P. Dịch Vọng, Q. Cầu Giấy, Hà Nội',
    phone: '024.3838.9999',
  },
  {
    id: 'b1000000-0000-0000-0000-000000000002',
    name: 'BK-Store Quận 1 (TP. Hồ Chí Minh)',
    city: 'TP. Hồ Chí Minh',
    address: '123 Lê Lợi, P. Bến Thành, Quận 1, TP. Hồ Chí Minh',
    phone: '028.3939.8888',
  },
  {
    id: 'b1000000-0000-0000-0000-000000000003',
    name: 'BK-Store Hải Châu (Đà Nẵng)',
    city: 'Đà Nẵng',
    address: '45 Nguyễn Văn Linh, P. Nam Dương, Q. Hải Châu, Đà Nẵng',
    phone: '0236.3777.666',
  },
];

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
  onRequireLogin?: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderSuccess,
  onRequireLogin,
}) => {
  const { items, removeSelectedItems, selectAllItems } = useCartStore();
  const selectedItems = items.filter((item) => item.selected !== false);
  const effectiveItems = selectedItems.length > 0 ? selectedItems : items;
  const effectiveTotalPrice = effectiveItems.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  );
  const { user, isAuthenticated, openAuthModal } = useAuthStore();

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(DEFAULT_BRANCHES[0].id);
  const [branches, setBranches] = useState<Branch[]>(DEFAULT_BRANCHES);
  const [inventoryItems, setInventoryItems] = useState<ProductInventoryItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'QR_PAY'>('COD');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isWaitingQrPayment, setIsWaitingQrPayment] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(15 * 60);
  const [copiedField, setCopiedField] = useState<'code' | 'account' | null>(null);

  const selectedBranchObj =
    branches.find((b) => b.id === selectedBranchId) || DEFAULT_BRANCHES[0];

  // 15-minute countdown timer for QR payment step
  useEffect(() => {
    if (isWaitingQrPayment) {
      setCountdownSeconds(15 * 60);
      const timer = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isWaitingQrPayment]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto fill user details when available & ensure no field is empty
  useEffect(() => {
    if (isOpen && !createdOrder) {
      // 1. Recipient Name
      const fallbackName = user?.name || user?.fullName || 'Nguyễn Văn An';
      setCustomerName((prev) => (prev.trim() ? prev : fallbackName));

      // 2. Phone
      const fallbackPhone = user?.phone || '0912345678';
      setPhone((prev) => (prev.trim() ? prev : fallbackPhone));

      // 3. Address
      const fallbackAddress =
        user?.address && user.address.trim()
          ? user.address.trim()
          : 'Số 18 Hoàng Quốc Việt, Phường Nghĩa Đô, Cầu Giấy, Hà Nội';
      setAddress((prev) => (prev.trim() ? prev : fallbackAddress));

      // Auto-select all items in cart store if cart has items but none marked selected
      if (items.length > 0 && selectedItems.length === 0) {
        selectAllItems(true);
      }

      // If user is authenticated, query previous orders to pre-fill their real phone/address if available
      if (isAuthenticated) {
        fetchMyOrdersApi()
          .then((res) => {
            if (res.success && Array.isArray(res.data) && res.data.length > 0) {
              const latestOrder = res.data[0];
              if (latestOrder.phone && !user?.phone) {
                setPhone(latestOrder.phone);
              }
              if (latestOrder.address && (!user?.address || !user.address.trim())) {
                setAddress(latestOrder.address);
              }
              if (latestOrder.customerName && !user?.name) {
                setCustomerName(latestOrder.customerName);
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen, user, isAuthenticated, items.length, selectedItems.length, selectAllItems, createdOrder]);

  const getBranchStockForProduct = useCallback(
    (product: Product, branchId: string): number => {
      const invItem = inventoryItems.find(
        (it) => it.productId === product.id || it.productSlug === product.slug
      );
      if (invItem) {
        const bStock = invItem.branchesStock.find((bs) => bs.branchId === branchId);
        if (bStock !== undefined) return bStock.quantity;
      }
      // Fallback to product.inventories if present
      if (product.inventories && product.inventories.length > 0) {
        const matched = product.inventories.find(
          (inv) =>
            inv.branchId === branchId ||
            (branchId.endsWith('001') && (inv.branchId === 'b1' || inv.city.includes('Hà Nội'))) ||
            (branchId.endsWith('002') && (inv.branchId === 'b2' || inv.city.includes('Hồ Chí Minh') || inv.city.includes('HCM'))) ||
            (branchId.endsWith('003') && (inv.branchId === 'b3' || inv.city.includes('Đà Nẵng')))
        );
        if (matched !== undefined) return matched.quantity;
      }
      return 5;
    },
    [inventoryItems]
  );

  // Initialize modal state on fresh open
  useEffect(() => {
    if (isOpen) {
      setCreatedOrder(null);
      setIsWaitingQrPayment(false);
      setIsVerifyingPayment(false);
      setCopiedField(null);
      setErrorMsg('');
      setIsLoading(false);
      setIsCopied(false);
      setIsConfirmOpen(false);
    }
  }, [isOpen]);

  // Load branch stock overview
  useEffect(() => {
    if (isOpen && !createdOrder) {
      fetchInventoryOverview()
        .then((data) => {
          if (data.branches && data.branches.length > 0) {
            setBranches(data.branches);
          }
          if (data.items) {
            setInventoryItems(data.items);
            const currentItems = useCartStore.getState().items;
            const availBranches = data.branches?.length ? data.branches : DEFAULT_BRANCHES;
            const firstValid = availBranches.find((b) =>
              currentItems.every(({ product, quantity }) => {
                const invProd = data.items.find(
                  (it) => it.productId === product.id || it.productSlug === product.slug
                );
                const qty =
                  invProd?.branchesStock.find((bs) => bs.branchId === b.id)?.quantity ?? 5;
                return qty >= quantity;
              })
            );
            if (firstValid) {
              setSelectedBranchId(firstValid.id);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, createdOrder]);

  if (!isOpen) return null;

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Client-side validations matching backend schema
    if (!customerName.trim() || customerName.trim().length < 2) {
      setErrorMsg('Vui lòng nhập họ và tên (tối thiểu 2 ký tự).');
      return;
    }

    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(phone.trim())) {
      setErrorMsg('Số điện thoại không hợp lệ (yêu cầu 10 số bắt đầu bằng 0, ví dụ: 0987654321).');
      return;
    }

    if (!address.trim() || address.trim().length < 5) {
      setErrorMsg('Vui lòng nhập địa chỉ nhận hàng chi tiết (tối thiểu 5 ký tự).');
      return;
    }

    if (effectiveItems.length === 0) {
      setErrorMsg('Không có món nào trong giỏ hàng để đặt! Vui lòng chọn sản phẩm vào giỏ.');
      return;
    }

    // Client-side inventory validation (total + selected branch) only for effective items
    for (const item of effectiveItems) {
      const maxStock = item.product.stock ?? item.product.stock_quantity ?? 0;
      if (maxStock <= 0) {
        setErrorMsg(`Sản phẩm "${item.product.name}" hiện đã hết hàng trong kho. Vui lòng quay lại giỏ hàng để bỏ chọn hoặc gỡ bỏ.`);
        return;
      }
      if (item.quantity > maxStock) {
        setErrorMsg(
          `Sản phẩm "${item.product.name}" chỉ còn ${maxStock} máy trong kho (bạn đang chọn ${item.quantity} máy). Vui lòng điều chỉnh lại số lượng.`
        );
        return;
      }

      const branchStock = getBranchStockForProduct(item.product, selectedBranchId);
      if (item.quantity > branchStock) {
        setErrorMsg(
          `Kho "${selectedBranchObj.name}" hiện chỉ còn ${branchStock} máy "${item.product.name}" (bạn đặt ${item.quantity} máy). Vui lòng chọn kho chi nhánh khác!`
        );
        return;
      }
    }

    if (!isAuthenticated || !user) {
      setErrorMsg('Vui lòng đăng nhập tài khoản trước khi tiến hành đặt hàng.');
      return;
    }

    setIsConfirmOpen(true);
  };

  const handleConfirmOrder = async () => {
    if (!isAuthenticated || !user) {
      setErrorMsg('Vui lòng đăng nhập tài khoản trước khi tiến hành đặt hàng.');
      setIsConfirmOpen(false);
      return;
    }

    // If QR_PAY is selected: DO NOT create order yet! Switch directly to the QR payment step
    if (paymentMethod === 'QR_PAY') {
      setIsConfirmOpen(false);
      setIsWaitingQrPayment(true);
      return;
    }

    // COD flow: directly create order in backend
    setIsLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        customerName: customerName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        note: note.trim() || undefined,
        branchId: selectedBranchId,
        paymentMethod: 'COD' as const,
        userId: user.id,
        items: effectiveItems.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
      };

      const [res] = await Promise.all([
        createOrderApi(payload),
        new Promise((resolve) => setTimeout(resolve, 900)),
      ]);

      if (res.success && res.data) {
        setIsConfirmOpen(false);
        setCreatedOrder(res.data);
        if (selectedItems.length > 0) {
          removeSelectedItems();
        } else {
          useCartStore.getState().clearCart();
        }
      } else {
        setIsConfirmOpen(false);
        setErrorMsg(res.error || 'Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ.';
      setIsConfirmOpen(false);
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCreatedOrder(null);
    setIsWaitingQrPayment(false);
    setIsVerifyingPayment(false);
    setCopiedField(null);
    setErrorMsg('');
    setIsLoading(false);
    setIsCopied(false);
    setIsConfirmOpen(false);
    onClose();
  };

  const handleCancelQrStep = () => {
    // Returns back to previous checkout form step!
    // No order was created in DB, no cart items were removed!
    setIsWaitingQrPayment(false);
  };

  const handleCompleteQrPayment = async () => {
    if (!isAuthenticated || !user) {
      setErrorMsg('Vui lòng đăng nhập tài khoản trước khi hoàn tất đặt hàng.');
      setIsWaitingQrPayment(false);
      return;
    }

    setIsVerifyingPayment(true);
    setErrorMsg('');

    try {
      const payload = {
        customerName: customerName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        note: note.trim() || undefined,
        branchId: selectedBranchId,
        paymentMethod: 'QR_PAY' as const,
        userId: user.id,
        items: effectiveItems.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
      };

      // Smooth deliberate delay (~1200ms) simulating bank verification + backend order creation
      const [res] = await Promise.all([
        createOrderApi(payload),
        new Promise((resolve) => setTimeout(resolve, 1200)),
      ]);

      if (res.success && res.data) {
        // Also update order status to confirmed on backend
        try {
          await updateOrderStatusApi(
            res.data.orderCode,
            'confirmed',
            `Đã nhận thanh toán chuyển khoản VietQR thành công (${formatPrice(
              effectiveTotalPrice
            )}). Đơn hàng đã được chuyển sang trạng thái chờ chuẩn bị hàng.`
          );
          res.data.status = 'confirmed';
        } catch {}

        setIsWaitingQrPayment(false);
        setCreatedOrder(res.data);

        if (selectedItems.length > 0) {
          removeSelectedItems();
        } else {
          useCartStore.getState().clearCart();
        }
      } else {
        setIsWaitingQrPayment(false);
        setErrorMsg(res.error || 'Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ.';
      setIsWaitingQrPayment(false);
      setErrorMsg(msg);
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  const handleCopyCode = () => {
    if (!createdOrder) return;
    navigator.clipboard.writeText(createdOrder.orderCode);
    setCopiedField('code');
    setIsCopied(true);
    setTimeout(() => {
      setCopiedField(null);
      setIsCopied(false);
    }, 2000);
  };

  const handleCopyAccount = () => {
    navigator.clipboard.writeText('0987654321');
    setCopiedField('account');
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const handleCopyQrNote = () => {
    navigator.clipboard.writeText(`BK ${phone.trim()}`);
    setCopiedField('code');
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const handleTrackCreatedOrder = () => {
    if (createdOrder) {
      const orderToTrack = createdOrder;
      setCreatedOrder(null);
      setErrorMsg('');
      onOrderSuccess(orderToTrack);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col p-6 md:p-8">
        {/* Close Button */}
        <button
          onClick={isWaitingQrPayment ? handleCancelQrStep : handleClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ORDER SUCCESS / QR PAYMENT / CHECKOUT FORM VIEW */}
        {createdOrder ? (
          /* SUCCESS VIEW: ĐẶT HÀNG / THANH TOÁN THÀNH CÔNG */
          <div className="flex flex-col py-2 space-y-5">
            {/* Success Header */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 shadow-inner">
                <CheckCircle className="w-9 h-9" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {createdOrder.paymentMethod === 'QR_PAY' ? 'Thanh toán & Đặt hàng thành công!' : 'Đặt hàng thành công!'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                {createdOrder.paymentMethod === 'QR_PAY' ? (
                  <>
                    Hệ thống đã nhận được thanh toán <strong>{formatPrice(createdOrder.totalAmount)}</strong> qua VietQR từ bạn. Đơn hàng <strong>{createdOrder.orderCode}</strong> đã được chuyển sang trạng thái chờ chuẩn bị hàng.
                  </>
                ) : (
                  <>
                    Cảm ơn <strong>{createdOrder.customerName}</strong>! Đơn hàng của bạn đã được ghi nhận vào hệ thống BK-Store và sẽ được thanh toán bằng tiền mặt khi giao hàng (COD).
                  </>
                )}
              </p>
            </div>

            {/* Order Code & Status Banner */}
            <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-blue-700 font-semibold">Mã đơn hàng:</span>
                  <span className="text-lg font-mono font-black text-blue-900">{createdOrder.orderCode}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span>{new Date(createdOrder.createdAt).toLocaleString('vi-VN')}</span>
                  <span>•</span>
                  {createdOrder.paymentMethod === 'QR_PAY' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Đã thanh toán (Paid) • Chờ xuất kho
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      Chờ duyệt kho & Giao hàng (COD)
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-blue-200 text-xs font-semibold text-blue-700 hover:bg-blue-50 active:bg-blue-100 transition-colors cursor-pointer shadow-2xs"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Đã sao chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-blue-600" />
                    <span>Sao chép mã đơn</span>
                  </>
                )}
              </button>
            </div>

            {/* List of Ordered Products */}
            {createdOrder.items && createdOrder.items.length > 0 && (
              <div className="border border-slate-200/90 rounded-2xl p-4 bg-slate-50/40">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/80">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-blue-600" />
                    <span>Chi tiết sản phẩm đã đặt ({createdOrder.items.length}):</span>
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    Tổng cộng: <strong>{createdOrder.items.reduce((sum, it) => sum + it.quantity, 0)}</strong> máy
                  </span>
                </div>

                <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                  {createdOrder.items.map((item, idx) => {
                    const itemUnitPrice = Number(item.unitPrice ?? item.price ?? 0);
                    const itemQty = Number(item.quantity ?? 1);
                    const itemTotal = itemUnitPrice * itemQty;
                    const displayName =
                      item.productName || item.productSlug || item.productId || 'Thiết bị công nghệ';

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {item.productThumbnail ? (
                            <img
                              src={item.productThumbnail}
                              alt={displayName}
                              className="w-10 h-10 object-contain rounded-lg bg-slate-50 border border-slate-200 p-0.5 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h5 className="font-bold text-xs text-slate-900 truncate" title={displayName}>
                              {displayName}
                            </h5>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              x{itemQty} • {formatPrice(itemUnitPrice)}
                            </div>
                          </div>
                        </div>

                        <div className="font-mono font-bold text-sm text-slate-900 shrink-0">
                          {formatPrice(itemTotal)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total breakdown */}
                <div className="mt-3 pt-3 border-t border-slate-200 text-xs space-y-1.5 font-medium">
                  <div className="flex justify-between text-slate-600">
                    <span>Phí vận chuyển:</span>
                    <span className="text-emerald-600 font-bold">Miễn phí toàn quốc</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-1 border-t border-dashed border-slate-200">
                    <span>Tổng tiền thanh toán:</span>
                    <span className="text-lg text-blue-700 font-mono font-black">
                      {formatPrice(createdOrder.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Recipient summary */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2 text-slate-600">
              <div className="font-bold text-slate-800 pb-1 border-b border-slate-200/80 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Thông tin giao nhận & vận chuyển:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                <div>
                  <span className="text-slate-400">Người nhận:</span>{' '}
                  <strong className="text-slate-800">{createdOrder.customerName}</strong> ({createdOrder.phone})
                </div>
                <div>
                  <span className="text-slate-400">Phương thức:</span>{' '}
                  <strong className="text-slate-800">
                    {createdOrder.paymentMethod === 'COD'
                      ? 'Thanh toán tiền mặt (COD)'
                      : 'Chuyển khoản VietQR (Đã thanh toán)'}
                  </strong>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400">Địa chỉ giao:</span>{' '}
                  <span className="text-slate-800 font-medium">{createdOrder.address}</span>
                </div>
                {createdOrder.branchName && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-400">Kho xuất hàng:</span>{' '}
                    <span className="text-blue-700 font-bold">{createdOrder.branchName}</span>
                  </div>
                )}
                {createdOrder.note && (
                  <div className="sm:col-span-2 text-[11px] text-slate-500 italic">
                    Ghi chú: &ldquo;{createdOrder.note}&rdquo;
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 w-full pt-1">
              <button
                onClick={handleTrackCreatedOrder}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <span>Tra cứu tiến trình đơn hàng</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                href="/orders"
                onClick={handleClose}
                className="py-3 px-4 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs text-center transition-colors"
              >
                Xem tất cả đơn hàng
              </Link>
              <button
                onClick={handleClose}
                className="py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold text-xs transition-colors cursor-pointer"
              >
                Đóng & Mua sắm
              </button>
            </div>
          </div>
        ) : isWaitingQrPayment ? (
          /* VIEW B: BƯỚC QUÉT MÃ VIETQR (CHƯA TẠO ĐƠN HÀNG) */
          <div className="flex flex-col py-2 space-y-4">
            {/* Header */}
            <div className="flex flex-col items-center text-center">
              <div className="relative w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 shadow-inner border border-blue-100">
                <QrCode className="w-9 h-9" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Vui lòng quét mã VietQR để thanh toán</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Quét mã chuyển khoản chính xác số tiền bên dưới. Sau khi chuyển khoản thành công, nhấn nút &ldquo;Tôi đã chuyển khoản xong&rdquo; để hệ thống xác nhận và tạo đơn hàng.
              </p>
            </div>

            {/* Status & Countdown Banner */}
            <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>Chờ thanh toán (QR VietQR)</span>
                </span>
                <span className="text-xs text-slate-500">
                  Người nhận: <strong className="text-slate-800 font-bold">{customerName}</strong>
                </span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-amber-200 text-xs font-mono font-bold text-amber-900 shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                <span>Hết hạn sau: {formatCountdown(countdownSeconds)}</span>
              </div>
            </div>

            {/* VietQR Bank Transfer Card */}
            <div className="p-5 rounded-3xl bg-slate-900 text-white w-full flex flex-col items-center shadow-lg border border-slate-800">
              <div className="flex items-center gap-2 mb-1.5">
                <CreditCard className="w-5 h-5 text-cyan-400" />
                <h4 className="text-sm font-bold text-slate-100">Quét mã bằng App Ngân hàng hoặc Ví điện tử</h4>
              </div>
              <p className="text-[11px] text-slate-400 text-center mb-3">
                Hỗ trợ hơn 40 ngân hàng (MB, Vietcombank, Techcombank, VPBank...) & MoMo, ZaloPay
              </p>

              {/* QR Image Box */}
              <div className="bg-white p-3 rounded-2xl shadow-xl my-1 relative group">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    `STK: 0987654321|MBBANK|BK-STORE|SO TIEN: ${effectiveTotalPrice}|NOI DUNG: BK ${phone.trim()}`
                  )}`}
                  alt="VietQR Payment"
                  className="w-48 h-48 rounded-lg"
                />
                <div className="text-center mt-1.5 text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider">
                  Mã QR tự động điền STK & Số tiền
                </div>
              </div>

              {/* Bank Details Table */}
              <div className="w-full text-xs space-y-2 mt-4 pt-3.5 border-t border-slate-800 font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Ngân hàng:</span>
                  <span className="font-bold text-white">MB Bank (Quân Đội)</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Số tài khoản:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-cyan-300 text-sm">0987 654 321</span>
                    <button
                      type="button"
                      onClick={handleCopyAccount}
                      className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-cyan-400 border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedField === 'account' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Chép</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Chủ tài khoản:</span>
                  <span className="font-bold text-white">BK-STORE VIETNAM</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Số tiền thanh toán:</span>
                  <span className="font-bold text-amber-400 text-base">{formatPrice(effectiveTotalPrice)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Nội dung chuyển khoản:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-400 text-sm bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/80">
                      BK {phone.trim()}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyQrNote}
                      className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-emerald-400 border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedField === 'code' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Chép</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 w-full text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Vui lòng chuyển đúng số tiền & nội dung để hệ thống tự động xác nhận đơn.</span>
              </div>
            </div>

            {/* Order recipient mini preview */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Người nhận:</span>
                <span className="font-bold text-slate-800">{customerName} ({phone})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Địa chỉ giao:</span>
                <span className="font-medium text-slate-800 text-right">{address}</span>
              </div>
              {selectedBranchObj?.name && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Kho xuất hàng:</span>
                  <span className="font-semibold text-blue-700">{selectedBranchObj.name}</span>
                </div>
              )}
            </div>

            {/* Action Buttons for QR waiting */}
            <div className="flex flex-col sm:flex-row gap-3 w-full pt-1">
              <button
                type="button"
                disabled={isVerifyingPayment}
                onClick={handleCancelQrStep}
                className="py-3.5 px-5 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4 text-slate-600" />
                <span>Hủy & Quay lại</span>
              </button>

              <button
                type="button"
                disabled={isVerifyingPayment}
                onClick={handleCompleteQrPayment}
                className="flex-1 py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-70"
              >
                {isVerifyingPayment ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Đang kiểm tra chuyển khoản & tạo đơn...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Giả lập chuyển khoản</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : !isAuthenticated ? (
          /* AUTHENTICATION REQUIRED GATE */
          <div className="py-6 px-2 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 border border-blue-100 shadow-xs">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Đăng nhập để đặt hàng</h3>
            <p className="text-sm text-slate-600 max-w-md mb-6 leading-relaxed">
              BK-Store yêu cầu khách hàng đăng nhập tài khoản trước khi hoàn tất đặt đơn. Điều này giúp bạn dễ dàng theo dõi tiến trình đơn hàng, bảo hành chính hãng và nhận hỗ trợ đơn hàng nhanh chóng từ BK-Bot.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm mb-6">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onRequireLogin) onRequireLogin();
                  else openAuthModal('Vui lòng đăng nhập tài khoản để tiến hành đặt hàng.');
                }}
                className="flex-1 py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập / Đăng ký</span>
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-sm cursor-pointer transition-colors"
              >
                Quay lại giỏ hàng
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 w-full max-w-md text-left">
              <div className="font-semibold text-slate-800 mb-1">💡 Tài khoản demo dùng thử nhanh:</div>
              <div className="font-mono text-[11px] text-slate-600">
                Email: <span className="text-blue-700 font-bold">khachhang@bkstore.vn</span> | MK: <span className="font-bold">123456</span>
              </div>
            </div>
          </div>
        ) : (
          /* CHECKOUT FORM VIEW */
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-slate-900">Thông tin đặt hàng</h3>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{user?.name || user?.fullName}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-5">
              Thông tin người nhận đã được đồng bộ tự động từ tài khoản của bạn.
            </p>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {effectiveItems.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
                  <ShoppingBag className="w-8 h-8 stroke-1.5" />
                </div>
                <h4 className="text-base font-bold text-slate-800">Giỏ hàng của bạn đang trống</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                  Vui lòng thêm sản phẩm vào giỏ hàng hoặc chọn nút &ldquo;Mua ngay&rdquo; để tiến hành đặt đơn.
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-5 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer shadow-md shadow-blue-500/20"
                >
                  Khám phá sản phẩm ngay
                </button>
              </div>
            ) : (
              <form onSubmit={handleOpenConfirm} className="space-y-4">
                {/* Customer Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Họ và tên người nhận <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn An"
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số điện thoại <span className="text-rose-500">* (10 số, bắt đầu bằng số 0)</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full text-sm font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Địa chỉ giao hàng <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none"
                  />
                </div>

                {/* Branch / Warehouse Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Warehouse className="w-3.5 h-3.5 text-blue-600" />
                    <span>Chọn kho / chi nhánh xuất hàng <span className="text-rose-500">*</span></span>
                  </label>
                  <div className="grid grid-cols-1 gap-2.5">
                    {branches.map((branch) => {
                      const isSelected = selectedBranchId === branch.id;
                      const itemStocks = effectiveItems.map(({ product, quantity }) => {
                        const avail = getBranchStockForProduct(product, branch.id);
                        return {
                          productName: product.name,
                          needed: quantity,
                          avail,
                          enough: avail >= quantity,
                        };
                      });
                      const canFulfillAll = itemStocks.every((s) => s.enough);

                      return (
                        <button
                          key={branch.id}
                          type="button"
                          onClick={() => setSelectedBranchId(branch.id)}
                          className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
                            isSelected
                              ? canFulfillAll
                                ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/15'
                                : 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/15'
                              : canFulfillAll
                              ? 'border-slate-200 hover:border-slate-300 bg-white'
                              : 'border-slate-200 bg-slate-50/70 opacity-75'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'border-blue-600 bg-blue-600 text-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </span>
                              <span className="text-xs font-bold text-slate-900">{branch.name}</span>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                canFulfillAll
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {canFulfillAll ? 'Đủ hàng giao ngay' : 'Không đủ tồn kho'}
                            </span>
                          </div>

                          <div className="pl-6 flex items-center gap-1 text-[11px] text-slate-500">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{branch.address}</span>
                          </div>

                          <div className="pl-6 flex flex-wrap gap-1.5 mt-0.5">
                            {itemStocks.map((st, idx) => (
                              <span
                                key={idx}
                                className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                                  st.enough
                                    ? 'bg-white border-slate-200 text-slate-600'
                                    : 'bg-rose-50 border-rose-200 text-rose-700 font-semibold'
                                }`}
                              >
                                {effectiveItems.length > 1 ? `${st.productName.split('(')[0].trim()}: ` : 'Tồn kho tại nhánh: '}
                                <strong>{st.avail}</strong> máy (cần {st.needed})
                              </span>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ghi chú cho shipper (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Giao giờ hành chính, gọi trước khi đến..."
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Phương thức thanh toán
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('COD')}
                      className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        paymentMethod === 'COD'
                          ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-500/10'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <Banknote className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold">Thanh toán COD</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Tiền mặt khi nhận hàng</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('QR_PAY')}
                      className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        paymentMethod === 'QR_PAY'
                          ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-2 ring-blue-500/10'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold">Chuyển khoản QR</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Quét mã VietQR nhanh 24/7</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Selected Products Preview */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                    <span>Sản phẩm đặt mua ({effectiveItems.length}):</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      {effectiveItems.reduce((s, i) => s + i.quantity, 0)} món
                    </span>
                  </div>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {effectiveItems.map(({ product, quantity }) => (
                      <div
                        key={product.id}
                        className="flex items-center gap-2.5 text-xs bg-white p-2 rounded-lg border border-slate-100"
                      >
                        <img
                          src={product.thumbnail}
                          alt={product.name}
                          className="w-9 h-9 object-contain rounded border border-slate-200 p-0.5 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-800 truncate">{product.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {formatPrice(product.price)} × {quantity}
                          </div>
                        </div>
                        <div className="font-mono font-bold text-slate-700 shrink-0">
                          {formatPrice(product.price * quantity)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order items summary */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex justify-between text-slate-600 mb-1">
                    <span>Tổng số lượng:</span>
                    <span className="font-semibold text-slate-800">
                      {effectiveItems.reduce((s, i) => s + i.quantity, 0)} món
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 mb-1">
                    <span>Phí vận chuyển:</span>
                    <span className="font-semibold text-emerald-600">Miễn phí toàn quốc</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-2 border-t border-slate-200 mt-2">
                    <span>Tổng thanh toán:</span>
                    <span className="text-lg text-blue-700 font-mono font-black">{formatPrice(effectiveTotalPrice)}</span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-70 transition-all cursor-pointer"
                >
                  <span>Tiến hành đặt đơn</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        )}

        {/* CONFIRMATION POP-UP DIALOG */}
        {isConfirmOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col p-6 md:p-7 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              {/* Dialog Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Xác nhận thông tin đặt hàng</h4>
                    <p className="text-xs text-slate-500">Vui lòng kiểm tra lại đơn hàng trước khi gửi</p>
                  </div>
                </div>
                {!isLoading && (
                  <button
                    type="button"
                    onClick={() => setIsConfirmOpen(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Dialog Body */}
              <div className="py-4 space-y-3.5 text-xs text-slate-600">
                {/* Recipient Details */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
                  <div className="flex justify-between items-center text-slate-700">
                    <span className="text-slate-500">Người nhận:</span>
                    <span className="font-bold text-slate-900">{customerName}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span className="text-slate-500">Số điện thoại:</span>
                    <span className="font-bold font-mono text-slate-900">{phone}</span>
                  </div>
                  <div className="flex justify-between items-start text-slate-700 gap-4">
                    <span className="text-slate-500 shrink-0">Địa chỉ:</span>
                    <span className="font-medium text-slate-900 text-right leading-tight">{address}</span>
                  </div>
                  <div className="flex justify-between items-start text-slate-700 gap-4 pt-1.5 border-t border-slate-200/60">
                    <span className="text-slate-500 shrink-0">Kho xuất hàng:</span>
                    <span className="font-semibold text-blue-700 text-right">{selectedBranchObj.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span className="text-slate-500">Thanh toán:</span>
                    <span className="font-semibold text-slate-800">
                      {paymentMethod === 'COD' ? 'Tiền mặt khi nhận hàng (COD)' : 'Chuyển khoản VietQR'}
                    </span>
                  </div>
                  {note.trim() && (
                    <div className="flex justify-between items-start text-slate-700 gap-4 pt-1.5 border-t border-slate-200/60">
                      <span className="text-slate-500 shrink-0">Ghi chú:</span>
                      <span className="italic text-slate-600 text-right">&ldquo;{note}&rdquo;</span>
                    </div>
                  )}
                </div>

                {/* Products Summary */}
                <div>
                  <div className="flex items-center justify-between font-semibold text-slate-800 mb-2">
                    <span>Sản phẩm đặt mua ({effectiveItems.reduce((s, i) => s + i.quantity, 0)} món):</span>
                    <span className="text-emerald-600 text-[11px] font-bold">Freeship toàn quốc</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {effectiveItems.map(({ product, quantity }) => (
                      <div
                        key={product.id}
                        className="flex items-center gap-2.5 p-2 bg-slate-50/80 rounded-xl border border-slate-100"
                      >
                        <img
                          src={product.thumbnail}
                          alt={product.name}
                          className="w-9 h-9 object-contain rounded-lg border border-slate-200 p-0.5 bg-white shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-800 truncate text-xs">{product.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {formatPrice(product.price)} × {quantity}
                          </div>
                        </div>
                        <div className="font-mono font-bold text-slate-800 shrink-0 text-xs">
                          {formatPrice(product.price * quantity)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Price */}
                <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-100 flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm">Tổng thanh toán:</span>
                  <span className="font-mono font-black text-xl text-blue-700">
                    {formatPrice(effectiveTotalPrice)}
                  </span>
                </div>
              </div>

              {/* Dialog Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setIsConfirmOpen(false)}
                  className="px-5 py-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Kiểm tra lại
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleConfirmOrder}
                  className="flex-1 py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-75"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Đang tạo đơn & kiểm kho...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{paymentMethod === 'QR_PAY' ? 'Tiến hành quét mã QR' : 'Xác nhận đặt hàng'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
