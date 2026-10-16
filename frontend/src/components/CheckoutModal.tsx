'use client';

import React, { useState } from 'react';
import { X, CheckCircle, Copy, Check, CreditCard, Banknote, ShieldAlert, ArrowRight, Warehouse, MapPin, Lock, LogIn, UserCheck, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/lib/utils';
import { createOrderApi, fetchInventoryOverview } from '@/lib/api';
import { Order, Branch, Product, ProductInventoryItem } from '@/types';

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
  const { items, removeSelectedItems } = useCartStore();
  const selectedItems = items.filter((item) => item.selected !== false);
  const selectedTotalPrice = selectedItems.reduce(
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

  // Auto fill user details when available
  React.useEffect(() => {
    if (isOpen && user) {
      const displayName = user.name || user.fullName || '';
      if (displayName) setCustomerName(displayName);
      if (user.phone) setPhone(user.phone);
      if (user.address) setAddress(user.address);
    }
  }, [isOpen, user]);

  const getBranchStockForProduct = React.useCallback(
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

  React.useEffect(() => {
    if (isOpen) {
      setCreatedOrder(null);
      setErrorMsg('');
      setIsLoading(false);
      setIsCopied(false);

      fetchInventoryOverview()
        .then((data) => {
          if (data.branches && data.branches.length > 0) {
            setBranches(data.branches);
          }
          if (data.items) {
            setInventoryItems(data.items);
            // Automatically pick the first branch that has enough stock for all cart items
            const availBranches = data.branches?.length ? data.branches : DEFAULT_BRANCHES;
            const firstValid = availBranches.find((b) =>
              items.every(({ product, quantity }) => {
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
        .catch(() => {
          // Ignore error and use fallback
        });
    }
  }, [isOpen, items]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
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

    if (selectedItems.length === 0) {
      setErrorMsg('Không có món nào được chọn trong giỏ hàng! Vui lòng quay lại giỏ và tích chọn sản phẩm bạn muốn mua.');
      return;
    }

    const selectedBranchObj = branches.find((b) => b.id === selectedBranchId) || DEFAULT_BRANCHES[0];

    // Client-side inventory validation (total + selected branch) only for selected items
    for (const item of selectedItems) {
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

    setIsLoading(true);

    try {
      const payload = {
        customerName: customerName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        note: note.trim() || undefined,
        branchId: selectedBranchId,
        paymentMethod,
        userId: user.id,
        items: selectedItems.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
      };

      const res = await createOrderApi(payload);

      if (res.success && res.data) {
        setCreatedOrder(res.data);
        removeSelectedItems();
      } else {
        setErrorMsg(res.error || 'Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCreatedOrder(null);
    setErrorMsg('');
    setIsLoading(false);
    setIsCopied(false);
    onClose();
  };

  const handleCopyCode = () => {
    if (!createdOrder) return;
    navigator.clipboard.writeText(createdOrder.orderCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
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
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ORDER SUCCESS VIEW */}
        {createdOrder ? (
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10" />
            </div>

            <h3 className="text-2xl font-bold text-slate-900">Đặt hàng thành công!</h3>
            <p className="text-sm text-slate-500 mt-1">
              Cảm ơn bạn đã tin tưởng mua sắm tại hệ thống BK-Store.
            </p>

            {/* Order Code Box */}
            <div className="mt-5 p-4 rounded-2xl bg-blue-50/80 border border-blue-200 w-full flex items-center justify-between">
              <div className="text-left">
                <div className="text-xs text-blue-600 font-medium">Mã đơn hàng của bạn:</div>
                <div className="text-xl font-mono font-bold text-blue-900">{createdOrder.orderCode}</div>
              </div>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-blue-200 text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Đã sao chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>

            {/* If QR_PAY is selected -> Display VietQR Bank Transfer Card */}
            {createdOrder.paymentMethod === 'QR_PAY' && (
              <div className="mt-5 p-5 rounded-2xl bg-slate-900 text-white w-full flex flex-col items-center">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-5 h-5 text-cyan-400" />
                  <h4 className="text-sm font-bold text-slate-100">Quét mã VietQR để thanh toán</h4>
                </div>

                {/* QR Image Mock (VietQR quick link format) */}
                <div className="bg-white p-3 rounded-xl shadow-md my-2">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      `STK: 0987654321|MBBANK|BK-STORE|SO TIEN: ${createdOrder.totalAmount}|NOI DUNG: ${createdOrder.orderCode}`
                    )}`}
                    alt="VietQR Payment"
                    className="w-44 h-44"
                  />
                </div>

                <div className="w-full text-left text-xs space-y-1.5 mt-3 pt-3 border-t border-slate-800 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ngân hàng:</span>
                    <span className="font-bold text-white">MB Bank (Quân Đội)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Số tài khoản:</span>
                    <span className="font-bold text-cyan-300">0987 654 321</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Chủ tài khoản:</span>
                    <span className="font-bold text-white">BK-STORE VIETNAM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Số tiền:</span>
                    <span className="font-bold text-amber-400">{formatPrice(createdOrder.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Nội dung CK:</span>
                    <span className="font-bold text-emerald-400">{createdOrder.orderCode}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Recipient summary */}
            <div className="mt-4 w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1.5 text-slate-600">
              <div><strong className="text-slate-800">Người nhận:</strong> {createdOrder.customerName} ({createdOrder.phone})</div>
              <div><strong className="text-slate-800">Giao đến:</strong> {createdOrder.address}</div>
              {createdOrder.branchName && (
                <div><strong className="text-slate-800">Kho xuất hàng:</strong> <span className="text-blue-700 font-semibold">{createdOrder.branchName}</span></div>
              )}
              <div><strong className="text-slate-800">Phương thức:</strong> {createdOrder.paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng (COD)' : 'Chuyển khoản QR'}</div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={handleTrackCreatedOrder}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
              >
                <span>Tra cứu tiến trình đơn hàng</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleClose}
                className="py-3 px-5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-sm"
              >
                Đóng & Tiếp tục mua sắm
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

            {selectedItems.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <ShoppingBag className="w-16 h-16 text-slate-300 stroke-1 mb-3" />
                <h4 className="text-base font-bold text-slate-800">Chưa có sản phẩm nào được chọn</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Vui lòng quay lại giỏ hàng và tích chọn các món bạn muốn đặt mua.
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-5 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Quay lại giỏ hàng
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
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
                    placeholder="Ví dụ: Nguyễn Quế Bắc"
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
                      const itemStocks = selectedItems.map(({ product, quantity }) => {
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
                                {selectedItems.length > 1 ? `${st.productName.split('(')[0].trim()}: ` : 'Tồn kho tại nhánh: '}
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
                      className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
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
                      className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
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
                    <span>Sản phẩm đặt mua ({selectedItems.length}):</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      {selectedItems.reduce((s, i) => s + i.quantity, 0)} món
                    </span>
                  </div>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {selectedItems.map(({ product, quantity }) => (
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
                      {selectedItems.reduce((s, i) => s + i.quantity, 0)} món
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 mb-1">
                    <span>Phí vận chuyển:</span>
                    <span className="font-semibold text-emerald-600">Miễn phí toàn quốc</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-2 border-t border-slate-200 mt-2">
                    <span>Tổng thanh toán:</span>
                    <span className="text-lg text-blue-700 font-mono">{formatPrice(selectedTotalPrice)}</span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 disabled:opacity-70 transition-all cursor-pointer"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>Xác nhận đặt hàng</span>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
