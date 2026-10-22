'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import {
  Laptop,
  Search,
  ExternalLink,
  Shield,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  UploadCloud,
  FolderOpen,
  Loader2,
} from 'lucide-react';
import {
  fetchCategories,
  fetchProducts,
  createProductApi,
  updateProductApi,
  deleteProductApi,
} from '@/lib/api';
import { Category, Product } from '@/types';
import { formatPrice } from '@/lib/utils';

interface SpecRow {
  key: string;
  value: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formCategorySlug, setFormCategorySlug] = useState('laptop');
  const [formBrand, setFormBrand] = useState('');
  const [formPrice, setFormPrice] = useState<number | ''>('');
  const [formOriginalPrice, setFormOriginalPrice] = useState<number | ''>('');
  const [formStock, setFormStock] = useState<number | ''>(10);
  const [formWarrantyMonths, setFormWarrantyMonths] = useState<number | ''>(12);
  const [formThumbnail, setFormThumbnail] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSpecs, setFormSpecs] = useState<SpecRow[]>([
    { key: 'CPU', value: '' },
    { key: 'RAM', value: '' },
    { key: 'GPU', value: '' },
  ]);

  // Image Upload & Gallery State
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [serverImages, setServerImages] = useState<{ name: string; url: string }[]>([]);
  const [showImageGallery, setShowImageGallery] = useState(false);

  const fetchServerImages = async () => {
    try {
      const res = await fetch('/api/upload');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setServerImages(data.data);
      }
    } catch {
      // ignore
    }
  };

  const handleToggleGallery = () => {
    if (!showImageGallery) {
      fetchServerImages();
    }
    setShowImageGallery(!showImageGallery);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success && data.data?.url) {
        setFormThumbnail(data.data.url);
        showToast(`Đã tải ảnh ${data.data.filename} vào thư mục public/products!`);
        fetchServerImages();
      } else {
        showToast(data.error || 'Lỗi khi tải ảnh lên', 'error');
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Lỗi kết nối khi tải ảnh', 'error');
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  // Delete Confirmation State
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Status & Toast
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  useEffect(() => {
    let ignore = false;
    Promise.all([fetchCategories(), fetchProducts({ limit: 50 })])
      .then(([cats, prods]) => {
        if (!ignore) {
          setCategories(cats);
          setProducts(prods.products);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load products:', err);
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (selectedCategory !== 'all') {
      list = list.filter(
        (p) => (p.categorySlug || p.category_slug)?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, selectedCategory, searchQuery]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingId(null);
    setFormName('');
    setFormCategorySlug(categories[0]?.slug || 'laptop');
    setFormBrand('');
    setFormPrice('');
    setFormOriginalPrice('');
    setFormStock(10);
    setFormWarrantyMonths(12);
    setFormThumbnail('https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80');
    setFormDescription('');
    setFormSpecs([
      { key: 'CPU', value: '' },
      { key: 'RAM', value: '' },
      { key: 'Ổ cứng', value: '' },
    ]);
    setShowImageGallery(false);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (product: Product) => {
    setModalMode('edit');
    setEditingId(product.id);
    setShowImageGallery(false);
    setFormName(product.name);
    setFormCategorySlug(product.categorySlug || product.category_slug || 'laptop');
    setFormBrand(product.brand);
    setFormPrice(product.price);
    setFormOriginalPrice(product.originalPrice || product.original_price || '');
    setFormStock(product.stock ?? product.stock_quantity ?? 10);
    setFormWarrantyMonths(product.warrantyMonths ?? product.warranty_months ?? 12);
    setFormThumbnail(product.thumbnail);
    setFormDescription(product.description || '');

    const specsRows: SpecRow[] = Object.entries(product.specs || {}).map(([key, value]) => ({
      key,
      value: String(value),
    }));
    if (specsRows.length === 0) {
      specsRows.push({ key: 'CPU', value: '' }, { key: 'RAM', value: '' });
    }
    setFormSpecs(specsRows);
    setIsModalOpen(true);
  };

  // Add Spec Row
  const handleAddSpecRow = () => {
    setFormSpecs([...formSpecs, { key: '', value: '' }]);
  };

  // Remove Spec Row
  const handleRemoveSpecRow = (idx: number) => {
    setFormSpecs(formSpecs.filter((_, i) => i !== idx));
  };

  // Update Spec Row
  const handleSpecChange = (idx: number, field: 'key' | 'value', val: string) => {
    const updated = [...formSpecs];
    updated[idx][field] = val;
    setFormSpecs(updated);
  };

  // Save Product (Create or Edit)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      showToast('Vui lòng nhập tên sản phẩm', 'error');
      return;
    }
    if (!formBrand.trim()) {
      showToast('Vui lòng nhập thương hiệu', 'error');
      return;
    }
    if (!formPrice || Number(formPrice) <= 0) {
      showToast('Vui lòng nhập giá bán hợp lệ (> 0)', 'error');
      return;
    }
    if (!formThumbnail.trim()) {
      showToast('Vui lòng nhập đường dẫn ảnh thumbnail', 'error');
      return;
    }

    const specsObj: Record<string, string> = {};
    formSpecs.forEach((row) => {
      if (row.key.trim() && row.value.trim()) {
        specsObj[row.key.trim()] = row.value.trim();
      }
    });

    const payload: Partial<Product> = {
      name: formName.trim(),
      categorySlug: formCategorySlug,
      brand: formBrand.trim(),
      price: Number(formPrice),
      originalPrice: formOriginalPrice ? Number(formOriginalPrice) : undefined,
      stock: Number(formStock || 0),
      warrantyMonths: Number(formWarrantyMonths || 12),
      thumbnail: formThumbnail.trim(),
      images: [formThumbnail.trim()],
      description: formDescription.trim() || `${formName.trim()} chính hãng bảo hành tiêu chuẩn.`,
      specs: specsObj,
    };

    startTransition(async () => {
      try {
        if (modalMode === 'create') {
          const res = await createProductApi(payload);
          if (res.success && res.data) {
            setProducts((prev) => [res.data!, ...prev]);
            showToast('Tạo sản phẩm mới thành công!');
            setIsModalOpen(false);
          } else {
            showToast(res.error || 'Lỗi khi tạo sản phẩm', 'error');
          }
        } else if (modalMode === 'edit' && editingId) {
          const res = await updateProductApi(editingId, payload);
          if (res.success && res.data) {
            setProducts((prev) =>
              prev.map((p) => (p.id === editingId ? { ...p, ...res.data! } : p))
            );
            showToast('Cập nhật sản phẩm thành công!');
            setIsModalOpen(false);
          } else {
            showToast(res.error || 'Lỗi khi cập nhật sản phẩm', 'error');
          }
        }
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Lỗi xử lý sản phẩm', 'error');
      }
    });
  };

  // Delete Product Action
  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;

    startTransition(async () => {
      try {
        const res = await deleteProductApi(deletingProduct.id);
        if (res.success) {
          setProducts((prev) => prev.filter((p) => p.id !== deletingProduct.id));
          showToast(`Đã xóa sản phẩm "${deletingProduct.name}" thành công!`);
          setDeletingProduct(null);
        } else {
          showToast(res.error || 'Lỗi khi xóa sản phẩm', 'error');
        }
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Không thể xóa sản phẩm', 'error');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2 ${
            toast.type === 'success'
              ? 'bg-emerald-600/90 text-white shadow-emerald-500/20'
              : 'bg-rose-600/90 text-white shadow-rose-500/20'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-200 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
              <Laptop className="w-4 h-4" />
            </div>
            <span>Quản lý Sản phẩm & Kho hàng</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản trị toàn diện danh mục sản phẩm flagship, cấu hình phần cứng và đồng bộ trực tiếp với AI Chatbot BK-Bot.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-mono font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-xs">
            Tổng cộng: <strong className="text-blue-600">{products.length}</strong> sản phẩm
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm sản phẩm mới</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Category Filter */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Tất cả danh mục
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.slug
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên máy, hãng, CPU..."
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 outline-none focus:bg-white focus:border-blue-500 transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-mono text-[11px] tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Sản phẩm</th>
                <th className="px-5 py-3.5">Hãng & Danh mục</th>
                <th className="px-5 py-3.5">Thông số cốt lõi</th>
                <th className="px-5 py-3.5">Giá niêm yết</th>
                <th className="px-5 py-3.5 text-center">Tồn kho</th>
                <th className="px-5 py-3.5">Bảo hành</th>
                <th className="px-5 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    Không tìm thấy sản phẩm nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const stock = p.stock ?? p.stock_quantity ?? 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Thumbnail & Name */}
                      <td className="px-5 py-3.5 max-w-[280px]">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                            <img
                              src={p.thumbnail}
                              alt={p.name}
                              className="w-full h-full object-contain mix-blend-multiply"
                            />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 line-clamp-2 leading-snug">
                              {p.name}
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">
                              Mã: {p.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Brand & Category */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-800">
                            {p.brand}
                          </span>
                          <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                            {p.categoryName || p.categorySlug || p.category_slug}
                          </span>
                        </div>
                      </td>

                      {/* Specs chips */}
                      <td className="px-5 py-3.5 max-w-[220px]">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(p.specs || {}).slice(0, 2).map(([k, v]) => (
                            <span
                              key={k}
                              className="inline-block text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded truncate max-w-[190px]"
                              title={`${k}: ${v}`}
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-mono font-bold text-blue-700 text-sm">
                          {formatPrice(p.price)}
                        </div>
                        {(p.originalPrice || p.original_price) &&
                          (p.originalPrice || p.original_price)! > p.price && (
                            <div className="text-[10px] text-slate-400 line-through font-mono">
                              {formatPrice((p.originalPrice || p.original_price)!)}
                            </div>
                          )}
                      </td>

                      {/* Stock Quantity */}
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                            stock > 5
                              ? 'bg-emerald-50 text-emerald-700'
                              : stock > 0
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          <Package className="w-3 h-3" />
                          {stock} sản phẩm
                        </span>
                      </td>

                      {/* Warranty */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-slate-600 font-mono text-[11px]">
                          <Shield className="w-3.5 h-3.5 text-blue-500" />
                          <span>{p.warrantyMonths || p.warranty_months || 12} tháng</span>
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Chỉnh sửa sản phẩm"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeletingProduct(p)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Xóa sản phẩm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          {/* Storefront Link */}
                          <a
                            href={`/?search=${encodeURIComponent(p.name)}`}
                            target="_blank"
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Xem trên Storefront"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create & Edit Product */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  {modalMode === 'create' ? <Plus className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {modalMode === 'create' ? 'Thêm Sản phẩm Flagship Mới' : 'Chỉnh sửa Sản phẩm'}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Thông tin sẽ tự động được đồng bộ với API và vector tri thức RAG của BK-Bot.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên sản phẩm <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ví dụ: MacBook Pro 14 M4 Pro 24GB/512GB"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-blue-500 transition-all font-medium"
                />
              </div>

              {/* Category & Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Danh mục <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formCategorySlug}
                    onChange={(e) => setFormCategorySlug(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-blue-500 transition-all font-medium"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Thương hiệu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    placeholder="Apple, Dell, Asus, Samsung, Sony..."
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-blue-500 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giá bán thực tế (VNĐ) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1000}
                    step={1000}
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ví dụ: 49990000"
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-blue-500 transition-all font-semibold text-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giá gốc niêm yết (VNĐ) <span className="text-slate-400 font-normal">(tùy chọn)</span>
                  </label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={formOriginalPrice}
                    onChange={(e) => setFormOriginalPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ví dụ: 54990000"
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-blue-500 transition-all text-slate-600"
                  />
                </div>
              </div>

              {/* Stock & Warranty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số lượng tồn kho (sản phẩm)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Thời gian bảo hành (tháng)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formWarrantyMonths}
                    onChange={(e) => setFormWarrantyMonths(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Thumbnail URL with Live Preview & Upload to public/products */}
              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Đường dẫn ảnh Thumbnail <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer transition-all active:scale-95 shadow-2xs">
                      {isUploadingImage ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang tải...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                          <span>Tải ảnh từ máy</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={isUploadingImage}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={handleToggleGallery}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-all active:scale-95"
                      title="Xem danh sách ảnh đã có trong thư mục public/products"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
                      <span>Chọn ảnh có sẵn</span>
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 items-center">
                  <input
                    type="text"
                    required
                    value={formThumbnail}
                    onChange={(e) => setFormThumbnail(e.target.value)}
                    placeholder="/products/ten-anh.png hoặc https://..."
                    className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-blue-500 transition-all font-mono"
                  />
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                    {formThumbnail ? (
                      <img
                        src={formThumbnail}
                        alt="Preview"
                        className="w-full h-full object-contain mix-blend-multiply"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Package className="w-5 h-5 text-slate-300" />
                    )}
                  </div>
                </div>

                {/* Folder Path Guide */}
                <div className="mt-1.5 p-2 bg-blue-50/60 border border-blue-100 rounded-xl text-[11px] text-slate-600 flex flex-col gap-0.5">
                  <div className="flex items-center gap-1 text-blue-800 font-semibold">
                    <span>📁 Thư mục tự thêm ảnh:</span>
                    <code className="bg-white/80 px-1.5 py-0.5 rounded border border-blue-200 text-blue-900 font-mono text-[10px]">
                      frontend/public/products/
                    </code>
                  </div>
                  <p className="text-[10.5px] text-slate-500">
                    Bạn có thể copy/paste trực tiếp bất kỳ ảnh nào vào thư mục trên, rồi điền đường dẫn dạng <code className="text-blue-700 font-mono font-medium">/products/tên-ảnh.jpg</code> hoặc bấm nút &quot;Tải ảnh từ máy&quot; ở trên.
                  </p>
                </div>

                {/* Collapsible Image Gallery Drawer */}
                {showImageGallery && (
                  <div className="mt-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in duration-200 shadow-inner">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                        <span>Ảnh trong folder public/products ({serverImages.length})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowImageGallery(false)}
                        className="text-slate-400 hover:text-slate-700 text-xs font-semibold px-2 py-0.5 rounded hover:bg-slate-200 transition-colors"
                      >
                        ✕ Đóng
                      </button>
                    </div>

                    {serverImages.length === 0 ? (
                      <div className="text-center py-4 bg-white rounded-xl border border-dashed border-slate-300">
                        <p className="text-xs text-slate-500 font-medium">
                          Chưa có ảnh nào trong folder <code className="font-mono text-blue-600">frontend/public/products/</code>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Hãy copy ảnh vào folder đó hoặc dùng nút &quot;Tải ảnh từ máy&quot; phía trên!
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 max-h-48 overflow-y-auto pr-1">
                        {serverImages.map((img) => (
                          <div
                            key={img.url}
                            onClick={() => {
                              setFormThumbnail(img.url);
                              setShowImageGallery(false);
                              showToast(`Đã chọn ảnh ${img.name}`);
                            }}
                            className={`p-1.5 rounded-xl border cursor-pointer hover:border-blue-500 hover:shadow-sm transition-all flex flex-col items-center gap-1 group bg-white ${
                              formThumbnail === img.url
                                ? 'border-blue-600 ring-2 ring-blue-400/40 bg-blue-50/50'
                                : 'border-slate-200 hover:bg-slate-50'
                            }`}
                            title={`Click để chọn: ${img.name}`}
                          >
                            <div className="w-14 h-14 flex items-center justify-center overflow-hidden bg-slate-50 rounded-lg p-1">
                              <img src={img.url} alt={img.name} className="max-w-full max-h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform" />
                            </div>
                            <span className="text-[10px] text-slate-600 truncate w-full text-center group-hover:text-blue-700 font-mono font-medium">
                              {img.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả sản phẩm (phục vụ khách hàng & AI Chatbot)
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Điểm nhấn công nghệ, tính năng AI, thiết kế mỏng nhẹ, đối tượng phù hợp..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-blue-500 transition-all resize-none"
                />
              </div>

              {/* Dynamic Hardware Specs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-500" />
                    <span>Thông số kỹ thuật chi tiết (Specs)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddSpecRow}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Thêm thông số
                  </button>
                </div>

                <div className="space-y-2">
                  {formSpecs.map((spec, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Tên (CPU, RAM, Màn hình...)"
                        value={spec.key}
                        onChange={(e) => handleSpecChange(idx, 'key', e.target.value)}
                        className="w-1/3 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:bg-white focus:border-blue-500 font-mono"
                      />
                      <input
                        type="text"
                        placeholder="Giá trị (Apple M3 Max 14-core, 36GB...)"
                        value={spec.value}
                        onChange={(e) => handleSpecChange(idx, 'value', e.target.value)}
                        className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:bg-white focus:border-blue-500 font-mono"
                      />
                      {formSpecs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSpecRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isPending && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>{modalMode === 'create' ? 'Tạo sản phẩm' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Xác nhận xóa sản phẩm</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Bạn có chắc chắn muốn xóa sản phẩm <strong>&ldquo;{deletingProduct.name}&rdquo;</strong> khỏi hệ thống? Dữ liệu tồn kho và liên kết AI sẽ bị gỡ bỏ.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {isPending && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
                <span>Xóa vĩnh viễn</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
