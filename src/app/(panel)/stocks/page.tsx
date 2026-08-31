'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  Edit3, 
  X, 
  Check, 
  RefreshCw, 
  Coins, 
  Barcode, 
  Tag, 
  Printer, 
  Trash2, 
  Plus, 
  Search, 
  Pencil, 
  Sliders, 
  CheckSquare, 
  Square,
  Truck,
  Camera,
  AlertTriangle,
  Flame,
  Activity,
  Hourglass,
  Filter
} from 'lucide-react';
import { MESSAGES } from '@/constants/messages';
import { ROUTES } from '@/constants/routes';
import { THEME, ANIM } from '@/constants/theme';
import {
  DEFAULT_MIN_STOCK_THRESHOLD,
  TURNOVER_CATEGORIES,
  STOCK_ALERT_LEVELS,
  type TurnoverCategory,
} from '@/constants/stocks';
import HeaderActions from '@/components/HeaderActions';
import KelebekLabelModal from '@/components/KelebekLabelModal';
import BatchLabelPrintModal from '@/components/BatchLabelPrintModal';
import CriticalStockBadge, { TurnoverBadge } from '@/components/CriticalStockBadge';
import ReorderDraftModal from '@/components/ReorderDraftModal';
import CameraScannerModal from '@/components/CameraScannerModal';
import type { StockTurnoverItem, TurnoverAnalyticsSummary } from '@/lib/stocks/analytics';

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface Stock {
  id: string;
  label: string;
  type: string; // "sarrafiye" | "döviz"
  amount: number;
  minThreshold?: number;
  updatedAt: string;
}


interface Transaction {
  id: string;
  type: string;       // "buy" | "sell"
  productType: string;
  productCode: string;
  quantity: number;
  price: number;
  total: number;
  createdAt: string;
}

interface ProductItem {
  id: string;
  barcode: string;
  title: string;
  description?: string | null;
  carat: number;
  weight: number;
  laborType: 'fixed' | 'percentage' | 'milyem';
  laborCost: number;
  status: 'IN_STOCK' | 'SOLD' | 'RETURNED';
  category?: string | null;
  subType?: string | null;
  subSubType?: string | null;
  size?: string | null;
  costMilyem?: number | null;
  laborMilyem?: number | null;
  sellingMilyem?: number | null;
  profitMargin?: number | null;
  costPrice?: number | null;
  supplierName?: string | null;
  quantity?: number | null;
  dealerName?: string;
  createdAt: string;
}

// ─── Yardımcı Sabitler ────────────────────────────────────────────────────────

const FILTER_ALL = 'all' as const;
const FILTER_SARRAFIYE = 'sarrafiye' as const;
const FILTER_DOVIZ = 'döviz' as const;

const TYPE_LABELS: Record<string, string> = {
  sarrafiye: 'Sarrafiye',
  döviz: 'Döviz',
};

const UNIT_MAP: Record<string, string> = {
  USD: '$',
  EUR: '€',
};

const STATUS_LABELS: Record<string, string> = {
  IN_STOCK: 'Stokta',
  SOLD: 'Satıldı',
  RETURNED: 'İade Edildi',
};

const STATUS_BADGES: Record<string, string> = {
  IN_STOCK: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-xs font-bold',
  SOLD: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full text-xs font-bold',
  RETURNED: 'bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full text-xs font-bold',
};

// ─── Alt Bileşenler ──────────────────────────────────────────────────────────

function StatCard({ title, value, icon: Icon, color }: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}) {
  return (
    <div className={`${THEME.GLASS_CARD} p-5 flex items-center gap-4`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">{title}</p>
        <p className="text-white text-xl font-bold font-mono mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function StockRow({ stock, onEdit, livePrice, turnoverItem }: {
  stock: Stock;
  onEdit: (stock: Stock) => void;
  livePrice?: { bid: number; ask: number };
  turnoverItem?: StockTurnoverItem;
}) {
  const unit = UNIT_MAP[stock.id] ?? 'Adet';
  const totalValueBid = livePrice ? stock.amount * livePrice.bid : null;
  const minThreshold = stock.minThreshold ?? DEFAULT_MIN_STOCK_THRESHOLD;
  const isLow = stock.amount <= minThreshold;

  return (
    <motion.div
      layout
      className={`flex items-center justify-between py-3.5 px-6 hover:bg-yellow-500/5 transition-colors border-b border-gray-800/40 last:border-b-0 ${isLow ? 'bg-red-500/5' : ''}`}
    >
      <div className="flex-1 min-w-0 mr-4">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-gray-100 font-semibold text-sm">{stock.label}</p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            stock.type === FILTER_SARRAFIYE
              ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
          }`}>
            {TYPE_LABELS[stock.type] ?? stock.type}
          </span>
          <CriticalStockBadge
            amount={stock.amount}
            minThreshold={minThreshold}
            size="sm"
          />
          {turnoverItem && (
            <TurnoverBadge
              category={turnoverItem.category}
              dailyVelocity={turnoverItem.dailyVelocity}
              size="sm"
            />
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-500 font-mono mt-1 flex-wrap">
          <span>Güncelleme: {new Date(stock.updatedAt).toLocaleString('tr-TR')}</span>
          {turnoverItem && turnoverItem.daysToStockout !== Infinity && (
            <span>• Tahmini Tükenme: {turnoverItem.daysToStockout > 0 ? `${turnoverItem.daysToStockout} gün` : 'Tükendi'}</span>
          )}
          {turnoverItem && turnoverItem.salesQuantity > 0 && (
            <span>• 30 Günlük Satış: {turnoverItem.salesQuantity} {unit}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-6 flex-shrink-0">
        {livePrice && stock.amount > 0 && (
          <div className="text-right hidden md:block w-32">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Tahmini TL Değer</p>
            <p className="text-yellow-400 text-sm font-bold font-mono">
              {totalValueBid != null ? `₺${Math.round(totalValueBid).toLocaleString('tr-TR')}` : '—'}
            </p>
          </div>
        )}

        <div className="text-right w-24">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Stok</p>
          <p className={`text-sm font-bold font-mono ${isLow ? 'text-red-400' : 'text-white'}`}>
            {stock.amount % 1 === 0 ? stock.amount.toFixed(0) : stock.amount.toFixed(2)} {unit !== 'Adet' ? unit : ''}
          </p>
        </div>

        <button
          onClick={() => onEdit(stock)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-300 bg-gray-800/60 hover:bg-yellow-500/20 hover:text-yellow-400 border border-gray-700/50 hover:border-yellow-500/30 transition-all"
        >
          <Edit3 size={12} />
          {MESSAGES.STOCKS_EDIT}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────

export default function StocksPage() {
  const [activeView, setActiveView] = useState<'standard' | 'barcode'>('standard');
  
  // Standard stock states
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, { bid: number; ask: number }>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<typeof FILTER_ALL | typeof FILTER_SARRAFIYE | typeof FILTER_DOVIZ>(FILTER_ALL);
  const [levelFilter, setLevelFilter] = useState<'all' | 'critical' | 'stagnant'>('all');
  const [analyticsSummary, setAnalyticsSummary] = useState<TurnoverAnalyticsSummary | null>(null);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);

  // Barcode product items states
  const [productItems, setProductItems] = useState<ProductItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Kelebek Label Printing & Multi-Select States
  const [labelModalProduct, setLabelModalProduct] = useState<ProductItem | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [showBatchPrintModal, setShowBatchPrintModal] = useState<boolean>(false);
  
  // Dynamic category tree, suppliers, and live prices
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [hasPrice, setHasPrice] = useState<{ bid: number; ask: number } | null>(null);

  // Dialog control states
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showSubCategoryDialog, setShowSubCategoryDialog] = useState(false);
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);

  // Mini dialog field inputs
  const [newCatName, setNewCatName] = useState('');
  const [newCatCode, setNewCatCode] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newSupplierName, setNewSupplierName] = useState('');

  const [productFormData, setProductFormData] = useState({
    category: '',
    categoryCode: '',
    subType: '',
    subSubType: '',
    carat: '14',
    weight: '',
    size: '',
    costMilyem: '0.585',
    laborType: 'milyem', // 'milyem' | 'percentage'
    laborMilyem: '0.000',
    sellingMilyem: '0.585',
    profitMargin: '0',
    costPrice: '',
    supplierName: '',
    customBarcode: '',
    useAutoBarcode: true,
    description: '',
    quantity: '1',
    inShowcase: false, // false: Mal vitrinde yok (Toptancı carisine Has borç işlenir), true: Vitrinde var (İşlenme)
  });

  // Edit product item states
  const [editingProductItem, setEditingProductItem] = useState<ProductItem | null>(null);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [editProductFormData, setEditProductFormData] = useState({
    id: '',
    barcode: '',
    category: '',
    subType: '',
    subSubType: '',
    carat: '14',
    weight: '',
    size: '',
    costMilyem: '0.585',
    laborType: 'milyem', // 'milyem' | 'percentage'
    laborMilyem: '0.000',
    sellingMilyem: '0.585',
    profitMargin: '0',
    costPrice: '',
    supplierName: '',
    description: '',
    quantity: '1',
    status: 'IN_STOCK'
  });

  // Edit stock amount modal states
  const [editStock, setEditStock] = useState<Stock | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editMinThreshold, setEditMinThreshold] = useState('5');
  const [editOperation, setEditOperation] = useState<'SET' | 'ADD' | 'SUBTRACT'>('SET');
  const [editDelta, setEditDelta] = useState('');
  const [savingStock, setSavingStock] = useState(false);

  // Yeni Özel Sarrafiye / Döviz Stoğu Ekleme Modalı
  const [showCustomStockModal, setShowCustomStockModal] = useState(false);
  const [customStockForm, setCustomStockForm] = useState({
    product: '',
    label: '',
    type: 'sarrafiye' as 'sarrafiye' | 'döviz',
    amount: '0',
    minThreshold: '5',
  });

  const fetchAll = useCallback(async () => {
    try {
      const [stocksRes, txRes, liveRes, productsRes, categoriesRes, suppliersRes, hasRes, analyticsRes] = await Promise.all([
        fetch(ROUTES.API_STOCKS),
        fetch(ROUTES.API_TRANSACTIONS),
        fetch(ROUTES.API_PRICES_LIVE),
        fetch('/api/products'),
        fetch('/api/categories'),
        fetch('/api/suppliers'),
        fetch('/api/prices/has'),
        fetch(ROUTES.API_STOCKS_ANALYTICS)
      ]);
      const [stocksData, txData, liveData, productsData, categoriesData, suppliersData, hasData, analyticsData] = await Promise.all([
        stocksRes.json(),
        txRes.json(),
        liveRes.json(),
        productsRes.json(),
        categoriesRes.json(),
        suppliersRes.json(),
        hasRes.json(),
        analyticsRes.json()
      ]);
      
      if (Array.isArray(stocksData)) {
        setStocks(stocksData);
      }
      if (Array.isArray(txData)) {
        setTransactions(txData);
      }
      if (Array.isArray(productsData)) {
        setProductItems(productsData);
      }
      if (Array.isArray(categoriesData)) {
        setCategories(categoriesData);
      }
      if (Array.isArray(suppliersData)) {
        setSuppliers(suppliersData);
      }
      if (hasData && typeof hasData === 'object' && hasData.bid) {
        setHasPrice(hasData);
      }
      if (analyticsData && !analyticsData.error) {
        setAnalyticsSummary(analyticsData);
      }
      
      const liveMap: Record<string, { bid: number; ask: number }> = {};
      if (Array.isArray(liveData)) {
        (liveData as Array<{ id: string; bid: number; ask: number }>).forEach(item => {
          liveMap[item.id] = { bid: item.bid, ask: item.ask };
        });
      }
      setLivePrices(liveMap);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);


  // Helper actions for dynamic CRUD management
  const handleAddCategory = async () => {
    if (!newCatName || !newCatCode) return;
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'category',
          name: newCatName,
          code: newCatCode
        })
      });
      if (res.ok) {
        setNewCatName('');
        setNewCatCode('');
        await fetchAll();
      } else {
        const d = await res.json();
        alert(d.error || 'Hata oluştu.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/categories?id=${id}&type=category`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchAll();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSubCategory = async (categoryId: string) => {
    if (!newSubName) return;
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'subCategory',
          name: newSubName,
          categoryId
        })
      });
      if (res.ok) {
        setNewSubName('');
        await fetchAll();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSubCategory = async (id: string) => {
    if (!confirm('Bu alt kategoriyi silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/categories?id=${id}&type=subCategory`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchAll();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSupplier = async () => {
    if (!newSupplierName) return;
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSupplierName })
      });
      if (res.ok) {
        setNewSupplierName('');
        await fetchAll();
      } else {
        const d = await res.json();
        alert(d.error || 'Hata oluştu.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm('Bu toptancıyı silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/suppliers?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchAll();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Stok Düzenle / Hızlı Ekle / Çıkar Kaydet
  const handleEditSave = async () => {
    if (!editStock) return;
    setSavingStock(true);
    try {
      let body: any = {
        id: editStock.id,
        minThreshold: parseFloat(editMinThreshold) || 5,
      };

      if (editOperation === 'SET') {
        const amount = parseFloat(editAmount);
        if (isNaN(amount)) return;
        body.amount = amount;
      } else if (editOperation === 'ADD') {
        const delta = parseFloat(editDelta);
        if (isNaN(delta) || delta <= 0) return;
        body.delta = delta;
      } else if (editOperation === 'SUBTRACT') {
        const delta = parseFloat(editDelta);
        if (isNaN(delta) || delta <= 0) return;
        body.delta = -delta;
      }

      const res = await fetch(ROUTES.API_STOCKS, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await fetchAll();
        setEditStock(null);
        setEditDelta('');
      } else {
        const d = await res.json();
        alert(d.error || 'Stok güncellenemedi.');
      }
    } finally {
      setSavingStock(false);
    }
  };

  // Yeni Özel Stok Tanımlama
  const handleCreateCustomStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStockForm.product || !customStockForm.label) {
      alert('Lütfen ürün kodu ve adını doldurun.');
      return;
    }
    setSavingStock(true);
    try {
      const res = await fetch(ROUTES.API_STOCKS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: customStockForm.product.trim(),
          label: customStockForm.label.trim(),
          type: customStockForm.type,
          amount: parseFloat(customStockForm.amount) || 0,
          minThreshold: parseFloat(customStockForm.minThreshold) || 5,
        }),
      });
      if (res.ok) {
        await fetchAll();
        setShowCustomStockModal(false);
        setCustomStockForm({ product: '', label: '', type: 'sarrafiye', amount: '0', minThreshold: '5' });
      } else {
        const d = await res.json();
        alert(d.details ? `${d.error} (${d.details})` : (d.error || 'Stok oluşturulamadı.'));
      }
    } finally {
      setSavingStock(false);
    }
  };

  const handleAddProductItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productFormData.category || !productFormData.weight) {
      alert('Lütfen kategori ve ağırlık alanlarını doldurun.');
      return;
    }
    setSaving(true);
    try {
      let payload = { ...productFormData };
      
      // Calculate cost price and sell price
      const weightNum = parseFloat(productFormData.weight) || 0;
      const costMilyemNum = parseFloat(productFormData.costMilyem) || 0;
      const laborMilyemNum = parseFloat(productFormData.laborMilyem) || 0;
      const totalCostMilyem = costMilyemNum + laborMilyemNum;
      
      // Maliyet Fiyatı = hasPrice.bid * totalCostMilyem * weight
      let finalCostPrice = 0;
      if (hasPrice) {
        finalCostPrice = hasPrice.bid * totalCostMilyem * weightNum;
      }
      payload.costPrice = finalCostPrice.toString();

      // If we are auto-generating barcode:
      if (productFormData.useAutoBarcode) {
        const nextBarcodeRes = await fetch(`/api/products?action=next-barcode&carat=${productFormData.carat}&categoryCode=${productFormData.categoryCode}`);
        const nextBarcodeData = await nextBarcodeRes.json();
        if (nextBarcodeData.nextBarcode) {
          payload.customBarcode = nextBarcodeData.nextBarcode;
        }
      }

      // Check if subSubType needs to be dynamically added to Category database
      const selectedCat = categories.find(c => c.name === productFormData.category);
      const selectedSub = selectedCat?.subCategories.find((s: any) => s.name === productFormData.subType);
      
      if (selectedSub && productFormData.subSubType) {
        const subSubExists = selectedSub.subSubCategories.some(
          (ss: any) => ss.name.toLowerCase() === productFormData.subSubType.toLowerCase()
        );
        if (!subSubExists) {
          // Create subSubCategory in background
          await fetch('/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'subSubCategory',
              name: productFormData.subSubType,
              subCategoryId: selectedSub.id
            })
          });
        }
      }

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setProductItems([data, ...productItems]);
        setShowProductModal(false);
        setProductFormData({
          category: '',
          categoryCode: '',
          subType: '',
          subSubType: '',
          carat: '14',
          weight: '',
          size: '',
          costMilyem: '0.585',
          laborType: 'milyem',
          laborMilyem: '0.000',
          sellingMilyem: '0.585',
          profitMargin: '0',
          costPrice: '',
          supplierName: '',
          customBarcode: '',
          useAutoBarcode: true,
          description: '',
          quantity: '1',
          inShowcase: false,
        });
        await fetchAll();
      } else {
        alert(data.error || 'Hata oluştu.');
      }
    } catch (err) {
      console.error(err);
      alert('Sunucu hatası.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProductItem = async (id: string) => {
    if (!confirm('Bu barkodlu ürünü silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/products?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setProductItems(productItems.filter(p => p.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'Silme işlemi gerçekleştirilemedi.');
      }
    } catch (err) {
      console.error(err);
      alert('Ağ hatası.');
    }
  };

  const openEditProductModal = (item: ProductItem) => {
    setEditingProductItem(item);
    setEditProductFormData({
      id: item.id,
      barcode: item.barcode,
      category: item.category || '',
      subType: item.subType || '',
      subSubType: item.subSubType || '',
      carat: String(item.carat),
      weight: String(item.weight),
      size: item.size || '',
      costMilyem: String(item.costMilyem ?? 0.585),
      laborType: item.laborType || ((item.profitMargin ?? 0) > 0 ? 'percentage' : 'milyem'),
      laborMilyem: String(item.laborMilyem ?? 0),
      sellingMilyem: String(item.sellingMilyem ?? ((item.costMilyem || 0) + (item.laborMilyem || 0))),
      profitMargin: String(item.profitMargin ?? 0),
      costPrice: item.costPrice ? String(item.costPrice) : '',
      supplierName: item.supplierName || '',
      description: item.description || '',
      quantity: String(item.quantity ?? 1),
      status: item.status || 'IN_STOCK'
    });
    setShowEditProductModal(true);
  };

  const handleUpdateProductItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProductFormData.id) return;

    setSaving(true);
    try {
      const weightNum = parseFloat(editProductFormData.weight) || 0;
      const costMilyemNum = parseFloat(editProductFormData.costMilyem) || 0;
      const laborMilyemNum = parseFloat(editProductFormData.laborMilyem) || 0;
      const totalCostMilyem = costMilyemNum + laborMilyemNum;

      let finalCostPrice = 0;
      if (hasPrice) {
        finalCostPrice = hasPrice.bid * totalCostMilyem * weightNum;
      }

      const payload = {
        ...editProductFormData,
        costPrice: finalCostPrice.toString()
      };

      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setProductItems(prev => prev.map(p => p.id === data.id ? data : p));
        setShowEditProductModal(false);
        setEditingProductItem(null);
        await fetchAll();
      } else {
        alert(data.error || 'Güncelleme gerçekleştirilemedi.');
      }
    } catch (err) {
      console.error(err);
      alert('Sunucu hatası.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrintLabel = (item: ProductItem) => {
    setLabelModalProduct(item);
  };

  const handleToggleSelectProduct = (id: string) => {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllProducts = () => {
    if (selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map(p => p.id));
    }
  };

  // Helper select handlers
  const handleCaratChange = (caratVal: string) => {
    let defaultMil = '0.585';
    if (caratVal === '24') defaultMil = '0.995';
    if (caratVal === '22') defaultMil = '0.916';
    if (caratVal === '18') defaultMil = '0.750';
    if (caratVal === '14') defaultMil = '0.585';
    if (caratVal === '8')  defaultMil = '0.333';
    const labor = parseFloat(productFormData.laborMilyem) || 0;
    const baseMil = parseFloat(defaultMil) || 0;
    setProductFormData(prev => ({
      ...prev,
      carat: caratVal,
      costMilyem: defaultMil,
      sellingMilyem: (baseMil + labor).toFixed(3)
    }));
  };

  const handleCategorySelect = (categoryName: string) => {
    const selected = categories.find(c => c.name === categoryName);
    setProductFormData(prev => ({
      ...prev,
      category: categoryName,
      categoryCode: selected ? selected.code : '',
      subType: '',
      subSubType: ''
    }));
  };

  const activeSubCategories = categories.find(c => c.name === productFormData.category)?.subCategories || [];
  const activeSubSubCategories = activeSubCategories.find((s: any) => s.name === productFormData.subType)?.subSubCategories || [];

  // Milyem / Fiyat Hesabı Değerleri
  const costMilyemNum = parseFloat(productFormData.costMilyem) || 0;
  const laborMilyemNum = parseFloat(productFormData.laborMilyem) || 0;
  const totalCostMilyem = costMilyemNum + laborMilyemNum;

  // Satış Milyemi doğrudan formdaki sellingMilyem değerinden alınır (varsayılan: totalCostMilyem)
  const sellingMilyemNum = parseFloat(productFormData.sellingMilyem) || totalCostMilyem;

  const weightNum = parseFloat(productFormData.weight) || 0;
  const costHasMultiplier = totalCostMilyem * weightNum;
  const sellingHasMultiplier = sellingMilyemNum * weightNum;
  const costPriceEstimate = (hasPrice?.bid || 0) * costHasMultiplier;
  const sellingPriceEstimate = (hasPrice?.ask || 0) * sellingHasMultiplier;

  // Standard filter logic
  const filteredStocks = stocks.filter(s => {
    if (filter !== FILTER_ALL && s.type !== filter) return false;
    if (levelFilter === 'critical') {
      const minThreshold = s.minThreshold ?? DEFAULT_MIN_STOCK_THRESHOLD;
      return s.amount <= minThreshold;
    }
    if (levelFilter === 'stagnant') {
      const turnoverItem = analyticsSummary?.items.find(i => i.product === s.id);
      return turnoverItem?.category === TURNOVER_CATEGORIES.HAREKETSIZ;
    }
    return true;
  });
  const sarrafiyeCount = stocks.filter(s => s.type === FILTER_SARRAFIYE).reduce((acc, s) => acc + (s.amount > 0 ? 1 : 0), 0);
  const dovizCount = stocks.filter(s => s.type === FILTER_DOVIZ && s.amount > 0).length;

  // Barcode search logic
  const filteredProducts = productItems.filter(item => 
    item.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const inStockBarcodeCount = productItems.filter(p => p.status === 'IN_STOCK').length;
  const soldBarcodeCount = productItems.filter(p => p.status === 'SOLD').length;
  const totalBarcodeWeight = productItems.filter(p => p.status === 'IN_STOCK').reduce((acc, p) => acc + p.weight, 0);

  return (
    <>
      {/* HEADER */}
      <header className={THEME.HEADER}>
        <div className="flex justify-between items-center w-full flex-wrap gap-3">
          <motion.div {...ANIM.FADE_UP} transition={{ duration: ANIM.DURATION.NORMAL }} className="flex items-center gap-3">
            <h1 className={THEME.HEADER_TITLE}>{MESSAGES.STOCKS_TITLE}</h1>
          </motion.div>
          
          <div className="flex items-center gap-2">
            {/* Sipariş Taslağı Aksiyon Butonu */}
            <button
              onClick={() => setShowReorderModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold rounded-xl text-sm flex items-center transition-all shadow-lg shadow-amber-500/10"
            >
              <Truck size={15} className="mr-1.5 text-black" />
              Sipariş Taslağı
              {analyticsSummary && analyticsSummary.totalCriticalCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-mono font-black rounded-full">
                  {analyticsSummary.totalCriticalCount}
                </span>
              )}
            </button>

            {/* Kamera İle Barkod Tara */}
            <button
              onClick={() => setShowCameraScanner(true)}
              className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors border border-gray-700/60"
              title="Kamera Barkod Okut"
            >
              <Camera size={15} />
              Kamera
            </button>

            {activeView === 'barcode' && (
              <button
                onClick={() => setShowProductModal(true)}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl text-sm font-bold flex items-center transition-all shadow-lg shadow-yellow-500/10"
              >
                <Plus size={15} className="mr-2 text-black" />
                Yeni Ürün Kartı
              </button>
            )}
            <button
              onClick={fetchAll}
              className={`${THEME.BTN_SECONDARY} flex items-center gap-2`}
            >
              <RefreshCw size={15} />
              Yenile
            </button>
            <HeaderActions />
          </div>
        </div>
      </header>

      <div className="p-3.5 sm:p-6 flex flex-col gap-4 sm:gap-6 min-w-0">
        
        {/* Main View Switcher */}
        <div className="flex border-b border-gray-800/40 pb-px gap-4 sm:gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveView('standard')}
            className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
              activeView === 'standard'
                ? 'border-yellow-500 text-yellow-500'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <Package size={16} /> Genel Stok (Sarrafiye & Döviz)
          </button>
          <button
            onClick={() => setActiveView('barcode')}
            className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
              activeView === 'barcode'
                ? 'border-yellow-500 text-yellow-500'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <Barcode size={16} className="text-yellow-400" /> Takı & Barkod Yönetimi
          </button>
        </div>

        {activeView === 'standard' ? (
          /* ========================================== */
          /* ============= GENEL STOK TABI ============ */
          /* ========================================== */
          <>
            {/* Özet Kartları */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard title="Toplam Ürün" value={stocks.length} icon={Package} color="bg-yellow-500/20" />
              <StatCard title="Sarrafiye Kalem" value={sarrafiyeCount} icon={Coins} color="bg-amber-500/20" />
              <StatCard title="Döviz Kalem" value={dovizCount} icon={TrendingUp} color="bg-blue-500/20" />
              <StatCard title="İşlem Geçmişi" value={transactions.length} icon={TrendingDown} color="bg-purple-500/20" />
            </div>

            {/* Filtre Sekmeleri */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              {/* Tür Filtreleri */}
              <div className="flex items-center gap-2">
                {([FILTER_ALL, FILTER_SARRAFIYE, FILTER_DOVIZ] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      filter === tab
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        : 'text-gray-400 hover:text-gray-200 bg-gray-800/40 border border-gray-700/30 hover:border-gray-600/40'
                    }`}
                  >
                    {tab === FILTER_ALL ? 'Tümü' : tab === FILTER_SARRAFIYE ? 'Sarrafiye' : 'Döviz'}
                  </button>
                ))}
              </div>

              {/* Stok Seviyesi Filtreleri */}
              <div className="flex items-center gap-2 bg-gray-950/60 p-1 rounded-xl border border-gray-800 flex-wrap">
                <button
                  onClick={() => setLevelFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    levelFilter === 'all'
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Tüm Seviyeler
                </button>
                <button
                  onClick={() => setLevelFilter('critical')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    levelFilter === 'critical'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'text-gray-400 hover:text-red-400'
                  }`}
                >
                  <AlertTriangle size={13} />
                  Kritik Seviye
                  {analyticsSummary && analyticsSummary.totalCriticalCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-red-600 text-white text-[10px] font-mono rounded-full">
                      {analyticsSummary.totalCriticalCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setLevelFilter('stagnant')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    levelFilter === 'stagnant'
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'text-gray-400 hover:text-purple-400'
                  }`}
                >
                  <Hourglass size={13} />
                  Hareketsiz Stok
                  {analyticsSummary && analyticsSummary.categoryCounts[TURNOVER_CATEGORIES.HAREKETSIZ] > 0 && (
                    <span className="px-1.5 py-0.2 bg-purple-600 text-white text-[10px] font-mono rounded-full">
                      {analyticsSummary.categoryCounts[TURNOVER_CATEGORIES.HAREKETSIZ]}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Stok Tablosu */}
            <motion.div
              {...ANIM.FADE_UP}
              transition={{ duration: ANIM.DURATION.NORMAL }}
              className={`${THEME.GLASS_CARD} overflow-hidden`}
            >
              <div className="px-5 py-4 border-b border-gray-800/40 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <Package size={18} className="text-yellow-500" />
                  <h2 className="text-white font-bold text-base">Sarrafiye & Döviz Stok Listesi</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomStockModal(true)}
                  className="px-3 py-1.5 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Plus size={14} />
                  Yeni Stok Kalemi Tanımla
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16 text-gray-500">
                  <RefreshCw size={20} className="animate-spin mr-2" /> Yükleniyor...
                </div>
              ) : filteredStocks.length === 0 ? (
                <div className="text-center py-16 text-gray-500">{MESSAGES.STOCKS_EMPTY}</div>
              ) : (
                <div className="divide-y divide-gray-800/40">
                  {filteredStocks.map(stock => (
                    <StockRow
                      key={stock.id}
                      stock={stock}
                      onEdit={(s) => {
                        setEditStock(s);
                        setEditAmount(String(s.amount));
                        setEditMinThreshold(String(s.minThreshold || 5));
                        setEditOperation('SET');
                        setEditDelta('');
                      }}
                      livePrice={livePrices[stock.id] ?? livePrices[`${stock.id}TRY`]}
                      turnoverItem={analyticsSummary?.items.find(i => i.product === stock.id)}
                    />
                  ))}
                </div>
              )}
            </motion.div>


            {/* Son İşlem Geçmişi */}
            <motion.div
              {...ANIM.FADE_UP}
              transition={{ delay: 0.1, duration: ANIM.DURATION.NORMAL }}
              className={`${THEME.GLASS_CARD} overflow-hidden`}
            >
              <div className="px-5 py-4 border-b border-gray-800/40 flex items-center gap-3">
                <TrendingUp size={18} className="text-purple-400" />
                <h2 className="text-white font-bold text-base">Son İşlemler</h2>
              </div>

              {transactions.length === 0 ? (
                <div className="text-center py-10 text-gray-500">{MESSAGES.TX_EMPTY}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800/40">
                        <th className="px-5 py-3 text-left text-xs text-gray-500 font-bold uppercase tracking-wider">Tarih</th>
                        <th className="px-5 py-3 text-left text-xs text-gray-500 font-bold uppercase tracking-wider">Tür</th>
                        <th className="px-5 py-3 text-left text-xs text-gray-500 font-bold uppercase tracking-wider">Ürün</th>
                        <th className="px-5 py-3 text-right text-xs text-gray-500 font-bold uppercase tracking-wider">Miktar</th>
                        <th className="px-5 py-3 text-right text-xs text-gray-500 font-bold uppercase tracking-wider">Birim Fiyat</th>
                        <th className="px-5 py-3 text-right text-xs text-gray-500 font-bold uppercase tracking-wider">Toplam</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.slice(0, 20).map(tx => (
                        <tr key={tx.id} className="border-b border-gray-800/30 hover:bg-yellow-500/3 transition-colors">
                          <td className="px-5 py-3 text-gray-400 text-xs font-mono">
                            {new Date(tx.createdAt).toLocaleString('tr-TR')}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                              tx.type === 'buy'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {tx.type === 'buy' ? '⬆ Alış' : '⬇ Satış'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-200 font-medium">{tx.productCode}</td>
                          <td className="px-5 py-3 text-right text-gray-300 font-mono">{tx.quantity}</td>
                          <td className="px-5 py-3 text-right text-gray-300 font-mono">
                            ₺{tx.price.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </td>
                          <td className="px-5 py-3 text-right text-yellow-400 font-bold font-mono">
                            ₺{tx.total.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </>
        ) : (
          /* ========================================== */
          /* ============ BARKOD TABI (TAKI) ============ */
          /* ========================================== */
          <>
            {/* Takı Stok Kartları */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard title="Toplam Kayıtlı Takı" value={productItems.length} icon={Barcode} color="bg-yellow-500/20" />
              <StatCard title="Stoktaki Ürünler" value={inStockBarcodeCount} icon={Tag} color="bg-emerald-500/20" />
              <StatCard title="Satılan Ürünler" value={soldBarcodeCount} icon={TrendingDown} color="bg-blue-500/20" />
              <StatCard title="Toplam Stok Ağırlığı" value={`${totalBarcodeWeight.toFixed(2)} gr`} icon={Package} color="bg-purple-500/20" />
            </div>

            {/* Toplu Seçim Eylem Çubuğu */}
            {selectedProductIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center justify-between flex-wrap gap-3"
              >
                <div className="flex items-center gap-2">
                  <CheckSquare className="text-yellow-400" size={18} />
                  <span className="text-sm font-bold text-white">
                    {selectedProductIds.length} adet ürün seçildi
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedProductIds([])}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white bg-gray-800 transition-colors"
                  >
                    Seçimi Temizle
                  </button>
                  <button
                    onClick={() => setShowBatchPrintModal(true)}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold text-black bg-yellow-500 hover:bg-yellow-400 flex items-center gap-1.5 transition-all shadow-md shadow-yellow-500/20"
                  >
                    <Printer size={14} /> Toplu Etiket Yazdır ({selectedProductIds.length})
                  </button>
                </div>
              </motion.div>
            )}

            {/* Arama Barı */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search size={18} className="text-gray-500" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Barkod kodu veya ürün açıklaması ile ara..."
                className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition-colors"
              />
            </div>

            {/* Barkod Ürün Listesi */}
            <motion.div
              {...ANIM.FADE_UP}
              transition={{ duration: ANIM.DURATION.NORMAL }}
              className={`${THEME.GLASS_CARD} overflow-hidden`}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800/40 bg-gray-900/20">
                      <th className="px-4 py-3 text-center text-xs text-gray-500 font-bold uppercase tracking-wider w-10">
                        <input
                          type="checkbox"
                          checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length}
                          onChange={handleSelectAllProducts}
                          className="rounded bg-gray-800 border-gray-700 text-yellow-500 focus:ring-0 cursor-pointer w-4 h-4"
                          title="Tümünü Seç / Kaldır"
                        />
                      </th>
                      <th className="px-5 py-3 text-left text-xs text-gray-500 font-bold uppercase tracking-wider">Barkod</th>
                      <th className="px-5 py-3 text-left text-xs text-gray-500 font-bold uppercase tracking-wider">Kategori Detayı</th>
                      <th className="px-5 py-3 text-left text-xs text-gray-500 font-bold uppercase tracking-wider">Toptancı</th>
                      <th className="px-5 py-3 text-center text-xs text-gray-500 font-bold uppercase tracking-wider">Ayar</th>
                      <th className="px-5 py-3 text-right text-xs text-gray-500 font-bold uppercase tracking-wider">Adet</th>
                      <th className="px-5 py-3 text-right text-xs text-gray-500 font-bold uppercase tracking-wider">Ağırlık</th>
                      <th className="px-5 py-3 text-center text-xs text-gray-500 font-bold uppercase tracking-wider">Ölçü</th>
                      <th className="px-5 py-3 text-right text-xs text-gray-500 font-bold uppercase tracking-wider">Maliyet Milyem</th>
                      <th className="px-5 py-3 text-right text-xs text-yellow-400 font-extrabold uppercase tracking-wider">Satış Milyemi</th>
                      <th className="px-5 py-3 text-right text-xs text-yellow-400 font-extrabold uppercase tracking-wider">Satış Has Çarpanı</th>
                      <th className="px-5 py-3 text-right text-xs text-emerald-400 font-extrabold uppercase tracking-wider">Satış Fiyatı (TL)</th>
                      <th className="px-5 py-3 text-center text-xs text-gray-500 font-bold uppercase tracking-wider">Durum</th>
                      <th className="px-5 py-3 text-right text-xs text-gray-500 font-bold uppercase tracking-wider">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={14} className="px-5 py-12 text-center text-gray-500">
                          <RefreshCw size={18} className="animate-spin inline mr-2" /> Yükleniyor...
                        </td>
                      </tr>
                    ) : filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={14} className="px-5 py-12 text-center text-gray-500">
                          Barkodlu ürün bulunamadı.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map(item => {
                        const totalMilyem = (item.costMilyem || 0) + (item.laborMilyem || 0);
                        const sellingMilyem = item.sellingMilyem != null && item.sellingMilyem > 0
                          ? item.sellingMilyem
                          : ((item.profitMargin || 0) > 0 ? totalMilyem * (1 + (item.profitMargin || 0) / 100) : totalMilyem);
                        const itemSellingHas = sellingMilyem * item.weight;
                        const itemSellingTL = (hasPrice?.ask || 0) * itemSellingHas;

                        return (
                          <tr key={item.id} className="border-b border-gray-800/30 hover:bg-yellow-500/3 transition-colors">
                            <td className="px-4 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={selectedProductIds.includes(item.id)}
                                onChange={() => handleToggleSelectProduct(item.id)}
                                className="rounded bg-gray-800 border-gray-700 text-yellow-500 focus:ring-0 cursor-pointer w-4 h-4"
                              />
                            </td>
                            <td className="px-5 py-3 font-mono font-bold text-yellow-500 text-sm">
                              {item.barcode}
                            </td>
                            <td className="px-5 py-3 text-gray-300">
                              <div className="text-xs font-bold text-white">{item.category || '—'}</div>
                              <div className="text-[11px] text-gray-400 font-medium">{[item.subType, item.subSubType].filter(Boolean).join(' › ') || '—'}</div>
                              {item.description && (
                                <div className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">{item.description}</div>
                              )}
                            </td>
                            <td className="px-5 py-3 text-xs font-semibold text-gray-300">
                              {item.supplierName || '—'}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className="bg-gray-800 text-gray-300 border border-gray-700 px-2 py-0.5 rounded text-xs font-bold">
                                {item.carat} Ayar
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right text-white font-mono font-semibold">
                              {item.quantity}
                            </td>
                            <td className="px-5 py-3 text-right text-white font-mono">
                              {item.weight.toFixed(2)} gr
                            </td>
                            <td className="px-5 py-3 text-center text-gray-300 font-mono text-xs">
                              {item.size || '—'}
                            </td>
                            <td className="px-5 py-3 text-right text-xs font-mono text-gray-300">
                              {totalMilyem > 0 ? (
                                <div>
                                  <span className="text-white font-bold">{totalMilyem.toFixed(3)}</span>
                                  <div className="text-[10px] text-gray-500">({item.costMilyem} + {item.laborMilyem})</div>
                                </div>
                              ) : '—'}
                            </td>
                            <td className="px-5 py-3 text-right text-xs font-mono text-yellow-400 font-extrabold text-sm">
                              {sellingMilyem.toFixed(3)}
                            </td>
                            <td className="px-5 py-3 text-right text-xs font-mono">
                              <div className="text-yellow-400 font-extrabold text-sm">{itemSellingHas.toFixed(3)} gr Has</div>
                            </td>
                            <td className="px-5 py-3 text-right text-emerald-400 font-mono font-extrabold text-sm">
                              {itemSellingTL > 0 ? `₺${Math.round(itemSellingTL).toLocaleString('tr-TR')}` : '—'}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className={STATUS_BADGES[item.status] || STATUS_BADGES.IN_STOCK}>
                                {STATUS_LABELS[item.status] || item.status}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => openEditProductModal(item)}
                                  className="p-1.5 rounded-lg bg-gray-800 text-yellow-400 hover:bg-yellow-500/20 border border-gray-700 transition-colors"
                                  title="Ürün Kartını Düzenle"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => handlePrintLabel(item)}
                                  className="p-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-yellow-500/20 hover:text-yellow-400 border border-gray-700 transition-colors"
                                  title="Etiket Yazdır"
                                >
                                  <Printer size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteProductItem(item.id)}
                                  className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:bg-red-500/20 hover:text-red-400 border border-gray-700 transition-colors"
                                  title="Sil"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* ─── GELİŞMİŞ STOK DÜZENLEME & HIZLI İKMAL MODALI ─── */}
      <AnimatePresence>
        {editStock && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
            onClick={() => setEditStock(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 border border-yellow-700/40 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div>
                  <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    <Package className="text-yellow-400" size={20} />
                    Stok Düzenleme & İkmal
                  </h3>
                  <p className="text-yellow-500/80 text-xs font-semibold mt-0.5">{editStock.label} ({editStock.id})</p>
                </div>
                <button onClick={() => setEditStock(null)} className="text-gray-400 hover:text-white p-1 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              {/* İşlem Modu Seçimi */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-950 rounded-xl border border-gray-800">
                <button
                  type="button"
                  onClick={() => setEditOperation('SET')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    editOperation === 'SET'
                      ? 'bg-yellow-500 text-gray-950 shadow-md'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  = Net Eşitle
                </button>
                <button
                  type="button"
                  onClick={() => setEditOperation('ADD')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    editOperation === 'ADD'
                      ? 'bg-emerald-500 text-gray-950 shadow-md'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  + Hızlı Ekle
                </button>
                <button
                  type="button"
                  onClick={() => setEditOperation('SUBTRACT')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    editOperation === 'SUBTRACT'
                      ? 'bg-red-500 text-white shadow-md'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  - Hızlı Çıkar
                </button>
              </div>

              {/* Değer Girişi */}
              {editOperation === 'SET' ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Yeni Net Stok Miktarı ({UNIT_MAP[editStock.id] || 'Adet'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    autoFocus
                    className="w-full px-4 py-3 bg-gray-950 border border-gray-700 rounded-xl text-white text-xl font-mono text-right focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/30"
                    placeholder="0"
                  />
                </div>
              ) : (
                <div className="space-y-2.5">
                  <label className="block text-xs font-semibold text-gray-300">
                    {editOperation === 'ADD' ? 'Stoğa Eklenecek Miktar' : 'Stoktan Düşülecek Miktar'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editDelta}
                    onChange={e => setEditDelta(e.target.value)}
                    autoFocus
                    className={`w-full px-4 py-3 bg-gray-950 border rounded-xl text-white text-xl font-mono text-right focus:outline-none ${
                      editOperation === 'ADD'
                        ? 'border-emerald-500/50 focus:border-emerald-400'
                        : 'border-red-500/50 focus:border-red-400'
                    }`}
                    placeholder="Miktar girin..."
                  />
                  {/* Hızlı Butonlar */}
                  <div className="flex gap-1.5 flex-wrap">
                    {[1, 5, 10, 25, 50].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setEditDelta(String(val))}
                        className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700"
                      >
                        {editOperation === 'ADD' ? `+${val}` : `-${val}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Kritik Stok Eşiği */}
              <div className="pt-2 border-t border-gray-800/80">
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  Kritik Stok Uyarı Eşiği (minThreshold)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={editMinThreshold}
                  onChange={e => setEditMinThreshold(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-yellow-400 text-sm font-mono"
                  placeholder="5"
                />
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Stok bu sayının altına düştüğünde ana sayfada ve listede kırmızı uyarı verir.
                </span>
              </div>

              {/* Butonlar */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditStock(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-gray-400 bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleEditSave}
                  disabled={savingStock}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-gray-950 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-yellow-500/20 disabled:opacity-50"
                >
                  {savingStock ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  Stoku Güncelle
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── YENİ ÖZEL SARRAFİYE / DÖVİZ STOK KALEMİ MODALI ─── */}
      <AnimatePresence>
        {showCustomStockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gray-900 border border-yellow-700/40 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  <Plus className="text-yellow-400" size={18} />
                  Yeni Sarrafiye / Döviz Stoğu Tanımla
                </h3>
                <button onClick={() => setShowCustomStockModal(false)} className="text-gray-400 hover:text-white p-1">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateCustomStock} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Ürün Kodu *</label>
                  <input
                    type="text"
                    required
                    value={customStockForm.product}
                    onChange={e => setCustomStockForm({ ...customStockForm, product: e.target.value })}
                    placeholder="Örn: GBP, CEYREK_YENI, KULCE_100GR"
                    className={THEME.INPUT}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Ürün Adı / Açıklaması *</label>
                  <input
                    type="text"
                    required
                    value={customStockForm.label}
                    onChange={e => setCustomStockForm({ ...customStockForm, label: e.target.value })}
                    placeholder="Örn: İngiliz Sterlini, Yeni Çeyrek, 100gr Külçe"
                    className={THEME.INPUT}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Kategori</label>
                    <select
                      value={customStockForm.type}
                      onChange={e => setCustomStockForm({ ...customStockForm, type: e.target.value as any })}
                      className={THEME.INPUT}
                    >
                      <option value="sarrafiye">Sarrafiye / Altın</option>
                      <option value="döviz">Döviz</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Başlangıç Stoğu</label>
                    <input
                      type="number"
                      step="0.01"
                      value={customStockForm.amount}
                      onChange={e => setCustomStockForm({ ...customStockForm, amount: e.target.value })}
                      placeholder="0"
                      className={THEME.INPUT}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Kritik Stok Eşiği</label>
                  <input
                    type="number"
                    min="0"
                    value={customStockForm.minThreshold}
                    onChange={e => setCustomStockForm({ ...customStockForm, minThreshold: e.target.value })}
                    placeholder="5"
                    className={THEME.INPUT}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomStockModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-gray-400 bg-gray-800 hover:bg-gray-700"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={savingStock}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-gray-950 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 flex items-center justify-center gap-1.5 shadow-lg shadow-yellow-500/20"
                  >
                    {savingStock ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                    Stoğu Ekle
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── YENİ TAKI BARKOD MODALI ─── */}
      <AnimatePresence>
        {showProductModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-3 sm:px-4 overflow-y-auto py-4 sm:py-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-3xl p-4 sm:p-8 shadow-2xl my-auto max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Başlığı */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-800/60">
                <div className="flex items-center gap-2">
                  <Barcode className="text-yellow-500" size={22} />
                  <h2 className="text-xl font-extrabold text-white">Yeni Takı Girişi (Barkodlu Stok)</h2>
                </div>
                <button onClick={() => setShowProductModal(false)} className={THEME.BTN_ICON}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddProductItem} className="space-y-5">
                
                {/* TOPTANCI (SUPPLIER) YÖNETİMİ */}
                <div className="bg-gray-950/40 border border-gray-850 p-5 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold text-yellow-500 uppercase tracking-wider">Toptancı Seçimi</label>
                    <button
                      type="button"
                      onClick={() => setShowSupplierDialog(true)}
                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 transition-all"
                    >
                      <Plus size={12} /> Toptancıları Yönet
                    </button>
                  </div>
                  <select
                    value={productFormData.supplierName}
                    onChange={e => setProductFormData({ ...productFormData, supplierName: e.target.value })}
                    className={THEME.SELECT}
                  >
                    <option value="">Toptancı Seçin (Opsiyonel)</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>

                  {/* VİTRİN DURUMU & TOPTANCI CARİ BORÇLANDIRMA */}
                  <div className="mt-4 pt-3 border-t border-gray-850/80">
                    <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-2">
                      Stok / Vitrin Durumu & Toptancı Cari Hesabı
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => setProductFormData({ ...productFormData, inShowcase: false })}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          !productFormData.inShowcase
                            ? 'bg-purple-500/15 border-purple-500/50 text-white shadow-lg shadow-purple-500/5'
                            : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <input
                            type="radio"
                            name="inShowcase"
                            checked={!productFormData.inShowcase}
                            onChange={() => setProductFormData({ ...productFormData, inShowcase: false })}
                            className="accent-purple-500"
                          />
                          <span className="text-purple-300">Mal Vitrinde Yok (Toptancıdan Yeni Geldi)</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 pl-5">
                          Toptancı carisine <strong>Giriş Milyemi (Geliş + İşçilik)</strong> üzerinden Has Borç işlenir.
                        </p>
                      </div>

                      <div
                        onClick={() => setProductFormData({ ...productFormData, inShowcase: true })}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          productFormData.inShowcase
                            ? 'bg-yellow-500/15 border-yellow-500/50 text-white shadow-lg shadow-yellow-500/5'
                            : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <input
                            type="radio"
                            name="inShowcase"
                            checked={productFormData.inShowcase}
                            onChange={() => setProductFormData({ ...productFormData, inShowcase: true })}
                            className="accent-yellow-500"
                          />
                          <span className="text-yellow-400">Mal Zaten Vitrinde Var</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1 pl-5">
                          Ürün sadece stok kartı olarak kaydedilir, Toptancı carisine borç işlenmez.
                        </p>
                      </div>
                    </div>

                    {!productFormData.inShowcase && productFormData.supplierName && (
                      <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-300 flex items-center justify-between font-mono">
                        <div>
                          <span className="font-bold block text-white">{productFormData.supplierName} Carisine Eklenecek Has Borç:</span>
                          <span className="text-[11px] text-gray-400 font-sans">
                            Hesaplama: {productFormData.weight || '0'} gr × ({productFormData.costMilyem || '0'} Geliş + {productFormData.laborMilyem || '0'} İşçilik) × {productFormData.quantity || '1'} Adet
                          </span>
                        </div>
                        <span className="font-extrabold text-base text-yellow-400 shrink-0">
                          {(() => {
                            const w = parseFloat(productFormData.weight) || 0;
                            const c = parseFloat(productFormData.costMilyem) || 0;
                            const l = parseFloat(productFormData.laborMilyem) || 0;
                            const q = parseInt(productFormData.quantity, 10) || 1;
                            const entryM = c + l;
                            const totalHas = w * entryM * q;
                            return `${totalHas.toFixed(3)} gr Has`;
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* KATEGORİ & ALT TÜRLER BÖLÜMÜ */}
                <div className="bg-gray-950/40 border border-gray-850 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-850 pb-2">
                    <h3 className="text-xs font-bold text-yellow-500 uppercase tracking-wider">Kategori & Detaylar</h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCategoryDialog(true)}
                        className="text-xs font-semibold text-yellow-400 hover:text-yellow-300 flex items-center gap-1 bg-yellow-500/10 px-2.5 py-1 rounded-lg border border-yellow-500/20 transition-all"
                      >
                        <Plus size={12} /> Kategorileri Yönet
                      </button>
                      <button
                        type="button"
                        disabled={!productFormData.category}
                        onClick={() => {
                          if (productFormData.category) setShowSubCategoryDialog(true);
                        }}
                        className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20 disabled:opacity-50 transition-all"
                      >
                        <Plus size={12} /> Alt Kategori Ekle
                      </button>
                    </div>
                  </div>
                  
                  {/* Satır 1: Kategori, Alt Tür, Alt Alt Tür */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={THEME.LABEL}>Ana Kategori *</label>
                      <select
                        required
                        value={productFormData.category}
                        onChange={e => handleCategorySelect(e.target.value)}
                        className={THEME.SELECT}
                      >
                        <option value="">Kategori Seçin</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.name}>{c.name} ({c.code})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={THEME.LABEL}>Alt Kategori *</label>
                      <select
                        required
                        disabled={!productFormData.category}
                        value={productFormData.subType}
                        onChange={e => setProductFormData({ ...productFormData, subType: e.target.value, subSubType: '' })}
                        className={THEME.SELECT}
                      >
                        <option value="">Seçim Yapın</option>
                        {activeSubCategories.map((s: any) => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={THEME.LABEL}>Alt Alt Kategori (Seçmeli / Yeni)</label>
                      <input
                        list="subSubTypesList"
                        type="text"
                        disabled={!productFormData.subType}
                        placeholder="Örn: Oluklu, Zigzag"
                        value={productFormData.subSubType}
                        onChange={e => setProductFormData({ ...productFormData, subSubType: e.target.value })}
                        className={THEME.INPUT}
                      />
                      <datalist id="subSubTypesList">
                        {activeSubSubCategories.map((ss: any) => (
                          <option key={ss.id} value={ss.name} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  {/* Satır 2: Barkod ve Manuel Seçimi */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-850/60 pt-3">
                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="useAutoBarcode"
                        checked={productFormData.useAutoBarcode}
                        onChange={e => setProductFormData({ ...productFormData, useAutoBarcode: e.target.checked })}
                        className="rounded bg-gray-850 border-gray-750 text-yellow-500 focus:ring-0 cursor-pointer w-4 h-4"
                      />
                      <label htmlFor="useAutoBarcode" className="text-sm font-semibold text-gray-300 cursor-pointer select-none">
                        Barkodu Otomatik Üret (Format: Ayar + Kısaltma + 000X)
                      </label>
                    </div>

                    <div>
                      <label className={THEME.LABEL}>Barkod Kodu</label>
                      <input
                        type="text"
                        disabled={productFormData.useAutoBarcode}
                        placeholder={productFormData.useAutoBarcode ? `Önizleme: ${productFormData.carat}${productFormData.categoryCode || 'KOD'}00001` : "Barkodu el ile girin"}
                        value={productFormData.useAutoBarcode ? "" : productFormData.customBarcode}
                        onChange={e => setProductFormData({ ...productFormData, customBarcode: e.target.value })}
                        className={`${THEME.INPUT} font-mono disabled:opacity-40 disabled:bg-gray-950/40`}
                      />
                    </div>
                  </div>
                </div>

                {/* MİLYEM, İŞÇİLİK & KAR MARJI HESAPLAMA PANELİ */}
                <div className="bg-gray-950/40 border border-gray-850 p-5 rounded-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-gray-900 border border-gray-800 rounded-xl gap-3">
                    <div>
                      <span className="text-xs font-bold text-white block flex items-center gap-1.5">
                        <Sliders size={14} className="text-yellow-400" /> Kâr / İşçilik Hesaplama Yöntemi
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {productFormData.laborType === 'milyem' 
                          ? 'Milyem bazlı işçilik ekle (Satış Milyemi = Geliş + İşçilik Milyemi)' 
                          : 'Yüzdelik kâr marjı ekle (Satış Milyemi = Geliş × (1 + %Kâr))'}
                      </span>
                    </div>

                    <div 
                      onClick={() => setProductFormData(prev => ({ 
                        ...prev, 
                        laborType: prev.laborType === 'milyem' ? 'percentage' : 'milyem',
                        profitMargin: '0',
                        laborMilyem: '0.000'
                      }))}
                      className="flex items-center bg-gray-950 p-1 rounded-xl cursor-pointer border border-gray-800 relative w-56 select-none shrink-0"
                    >
                      <div
                        className={`absolute top-1 bottom-1 rounded-lg bg-yellow-500 transition-all duration-200 shadow-md ${
                          productFormData.laborType === 'milyem' ? 'left-1 w-[105px]' : 'left-[110px] w-[108px]'
                        }`}
                      />
                      <span className={`relative z-10 w-1/2 text-center text-xs font-bold transition-colors ${
                        productFormData.laborType === 'milyem' ? 'text-black font-extrabold' : 'text-gray-400'
                      }`}>
                        Milyem Bazlı
                      </span>
                      <span className={`relative z-10 w-1/2 text-center text-xs font-bold transition-colors ${
                        productFormData.laborType === 'percentage' ? 'text-black font-extrabold' : 'text-gray-400'
                      }`}>
                        Yüzdelik (%)
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className={THEME.LABEL}>Ayar *</label>
                      <select
                        required
                        value={productFormData.carat}
                        onChange={e => handleCaratChange(e.target.value)}
                        className={THEME.SELECT}
                      >
                        <option value="24">24 Ayar (995)</option>
                        <option value="22">22 Ayar (916)</option>
                        <option value="18">18 Ayar (750)</option>
                        <option value="14">14 Ayar (585)</option>
                        <option value="8">8 Ayar (333)</option>
                      </select>
                    </div>
                    <div>
                      <label className={THEME.LABEL}>Geliş Milyemi *</label>
                      <input
                        type="number"
                        step="0.001"
                        required
                        value={productFormData.costMilyem}
                        onChange={e => {
                          const val = e.target.value;
                          const c = parseFloat(val) || 0;
                          const l = parseFloat(productFormData.laborMilyem) || 0;
                          setProductFormData({
                            ...productFormData,
                            costMilyem: val,
                            sellingMilyem: (c + l).toFixed(3)
                          });
                        }}
                        className={THEME.INPUT}
                      />
                    </div>
                    {productFormData.laborType === 'milyem' ? (
                      <div>
                        <label className={THEME.LABEL}>Giriş İşçiliği (milyem) *</label>
                        <input
                          type="number"
                          step="0.001"
                          required
                          placeholder="Örn: 0.120"
                          value={productFormData.laborMilyem}
                          onChange={e => {
                            const val = e.target.value;
                            const c = parseFloat(productFormData.costMilyem) || 0;
                            const l = parseFloat(val) || 0;
                            setProductFormData({
                              ...productFormData,
                              laborMilyem: val,
                              sellingMilyem: (c + l).toFixed(3)
                            });
                          }}
                          className={THEME.INPUT}
                        />
                      </div>
                    ) : (
                      <div>
                        <label className={THEME.LABEL}>Kâr Marjı (%) *</label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          placeholder="Örn: 10"
                          value={productFormData.profitMargin}
                          onChange={e => {
                            const val = e.target.value;
                            const c = parseFloat(productFormData.costMilyem) || 0;
                            const p = parseFloat(val) || 0;
                            const calcSell = p > 0 ? c * (1 + p / 100) : c;
                            setProductFormData({
                              ...productFormData,
                              profitMargin: val,
                              sellingMilyem: calcSell.toFixed(3)
                            });
                          }}
                          className={THEME.INPUT}
                        />
                      </div>
                    )}
                    <div>
                      <label className="text-yellow-400 font-bold text-xs uppercase tracking-wider block mb-1">
                        Satış Milyemi (Nihai) ⭐ *
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        required
                        placeholder="Örn: 0.931"
                        value={productFormData.sellingMilyem}
                        onChange={e => setProductFormData({ ...productFormData, sellingMilyem: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-gray-900 border-2 border-yellow-500/60 rounded-xl text-yellow-400 font-mono font-bold text-sm focus:outline-none focus:border-yellow-400 shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={THEME.LABEL}>Birim Ağırlığı (gr) *</label>
                      <input
                        type="number"
                        step="0.001"
                        required
                        placeholder="0.00 gr"
                        value={productFormData.weight}
                        onChange={e => setProductFormData({ ...productFormData, weight: e.target.value })}
                        className={THEME.INPUT}
                      />
                    </div>
                    <div>
                      <label className={THEME.LABEL}>Beden / Ölçü</label>
                      <input
                        type="text"
                        placeholder="Örn: 18, M, 54"
                        value={productFormData.size}
                        onChange={e => setProductFormData({ ...productFormData, size: e.target.value })}
                        className={THEME.INPUT}
                      />
                    </div>
                  </div>

                  {/* ANLIK MATEMATİKSEL RAPOR */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-gray-900/50 border border-gray-800 p-4 rounded-xl text-center font-mono">
                    <div>
                      <p className="text-[10px] text-gray-500">Maliyet Milyem</p>
                      <p className="text-sm font-bold text-white">{totalCostMilyem.toFixed(4)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500">Satış Milyem</p>
                      <p className="text-sm font-bold text-yellow-400">{sellingMilyemNum.toFixed(4)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-yellow-500/90 font-bold uppercase">Has Çarpanı</p>
                      <p className="text-sm font-extrabold text-yellow-400">{sellingHasMultiplier.toFixed(3)} gr</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500">Maliyet (TL)</p>
                      <p className="text-sm font-bold text-emerald-400">
                        ₺{Math.round(costPriceEstimate).toLocaleString('tr-TR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500">Tahmini Satış (TL)</p>
                      <p className="text-sm font-bold text-yellow-500">
                        ₺{Math.round(sellingPriceEstimate).toLocaleString('tr-TR')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* DETAY AÇIKLAMASI */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className={THEME.LABEL}>Açıklama</label>
                    <input
                      type="text"
                      placeholder="Raf yeri, özel notlar vb."
                      value={productFormData.description}
                      onChange={e => setProductFormData({ ...productFormData, description: e.target.value })}
                      className={THEME.INPUT}
                    />
                  </div>
                  <div>
                    <label className={THEME.LABEL}>Miktar / Adet</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={productFormData.quantity}
                      onChange={e => setProductFormData({ ...productFormData, quantity: e.target.value })}
                      className={THEME.INPUT}
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Form Butonları */}
                <div className="flex gap-3 pt-2 border-t border-gray-800/60">
                  <button type="submit" disabled={saving} className={`${THEME.BTN_PRIMARY} flex-1 justify-center py-3 text-sm`}>
                    {saving ? 'Ekleniyor...' : 'Takı Kartını Kaydet'}
                  </button>
                  <button type="button" onClick={() => setShowProductModal(false)} className={`${THEME.BTN_SECONDARY} py-3 text-sm`}>
                    İptal
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── TAKI BARKOD DÜZENLEME MODALİ ─── */}
      <AnimatePresence>
        {showEditProductModal && editingProductItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-3 sm:px-4 overflow-y-auto py-4 sm:py-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-3xl p-4 sm:p-8 shadow-2xl my-auto max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Başlığı */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-800/60">
                <div className="flex items-center gap-2">
                  <Pencil className="text-yellow-500" size={22} />
                  <div>
                    <h2 className="text-xl font-extrabold text-white">Takı Kartını Düzenle</h2>
                    <p className="text-xs font-mono text-yellow-500">Barkod: {editProductFormData.barcode}</p>
                  </div>
                </div>
                <button onClick={() => setShowEditProductModal(false)} className={THEME.BTN_ICON}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateProductItem} className="space-y-5">
                
                {/* TOPTANCI (SUPPLIER) YÖNETİMİ */}
                <div className="bg-gray-950/40 border border-gray-850 p-5 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold text-yellow-500 uppercase tracking-wider">Toptancı Seçimi</label>
                  </div>
                  <select
                    value={editProductFormData.supplierName}
                    onChange={e => setEditProductFormData({ ...editProductFormData, supplierName: e.target.value })}
                    className={THEME.SELECT}
                  >
                    <option value="">Toptancı Seçilmedi</option>
                    {suppliers.map((sup: any) => (
                      <option key={sup.id} value={sup.name}>{sup.name}</option>
                    ))}
                  </select>
                </div>

                {/* KATEGORİ SEÇİMİ */}
                <div className="bg-gray-950/40 border border-gray-850 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-yellow-500 uppercase tracking-wider">Kategori Seçimi</label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Ana Kategori */}
                    <div>
                      <label className={THEME.LABEL}>Ana Kategori *</label>
                      <select
                        required
                        value={editProductFormData.category}
                        onChange={e => {
                          const catName = e.target.value;
                          setEditProductFormData({
                            ...editProductFormData,
                            category: catName,
                            subType: '',
                            subSubType: ''
                          });
                        }}
                        className={THEME.SELECT}
                      >
                        <option value="">Kategori Seçin</option>
                        {categories.map((c: any) => (
                          <option key={c.id} value={c.name}>{c.name} ({c.code})</option>
                        ))}
                      </select>
                    </div>

                    {/* Alt Kategori */}
                    <div>
                      <label className={THEME.LABEL}>Alt Kategori</label>
                      <select
                        value={editProductFormData.subType}
                        onChange={e => {
                          setEditProductFormData({
                            ...editProductFormData,
                            subType: e.target.value,
                            subSubType: ''
                          });
                        }}
                        className={THEME.SELECT}
                      >
                        <option value="">Alt Kategori Seçin</option>
                        {(categories.find((c: any) => c.name === editProductFormData.category)?.subCategories || []).map((s: any) => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Alt Alt Tür (Option / Datalist) */}
                    <div>
                      <label className={THEME.LABEL}>Alt Alt Tür (Örn: Oluklu)</label>
                      <input
                        type="text"
                        list="edit-sub-sub-types-list"
                        placeholder="Seçin veya yazın"
                        value={editProductFormData.subSubType}
                        onChange={e => setEditProductFormData({ ...editProductFormData, subSubType: e.target.value })}
                        className={THEME.INPUT}
                      />
                      <datalist id="edit-sub-sub-types-list">
                        {((categories.find((c: any) => c.name === editProductFormData.category)?.subCategories || [])
                          .find((s: any) => s.name === editProductFormData.subType)?.subSubCategories || []).map((ss: any) => (
                          <option key={ss.id} value={ss.name} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                </div>

                {/* MİLYEM & İŞÇİLİK HESAPLAYICI */}
                <div className="bg-gray-950/40 border border-gray-850 p-5 rounded-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-gray-900 border border-gray-800 rounded-xl gap-3">
                    <div>
                      <span className="text-xs font-bold text-white block flex items-center gap-1.5">
                        <Sliders size={14} className="text-yellow-400" /> Kâr / İşçilik Hesaplama Yöntemi
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {editProductFormData.laborType === 'milyem' 
                          ? 'Milyem bazlı işçilik ekle (Satış Milyemi = Geliş + İşçilik Milyemi)' 
                          : 'Yüzdelik kâr marjı ekle (Satış Milyemi = Geliş × (1 + %Kâr))'}
                      </span>
                    </div>

                    <div 
                      onClick={() => setEditProductFormData(prev => ({ 
                        ...prev, 
                        laborType: prev.laborType === 'milyem' ? 'percentage' : 'milyem',
                        profitMargin: '0',
                        laborMilyem: '0.000'
                      }))}
                      className="flex items-center bg-gray-950 p-1 rounded-xl cursor-pointer border border-gray-800 relative w-56 select-none shrink-0"
                    >
                      <div
                        className={`absolute top-1 bottom-1 rounded-lg bg-yellow-500 transition-all duration-200 shadow-md ${
                          editProductFormData.laborType === 'milyem' ? 'left-1 w-[105px]' : 'left-[110px] w-[108px]'
                        }`}
                      />
                      <span className={`relative z-10 w-1/2 text-center text-xs font-bold transition-colors ${
                        editProductFormData.laborType === 'milyem' ? 'text-black font-extrabold' : 'text-gray-400'
                      }`}>
                        Milyem Bazlı
                      </span>
                      <span className={`relative z-10 w-1/2 text-center text-xs font-bold transition-colors ${
                        editProductFormData.laborType === 'percentage' ? 'text-black font-extrabold' : 'text-gray-400'
                      }`}>
                        Yüzdelik (%)
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className={THEME.LABEL}>Ayar *</label>
                      <select
                        value={editProductFormData.carat}
                        onChange={e => {
                          const c = e.target.value;
                          let defaultMil = '0.585';
                          if (c === '24') defaultMil = '0.995';
                          if (c === '22') defaultMil = '0.916';
                          if (c === '18') defaultMil = '0.750';
                          if (c === '14') defaultMil = '0.585';
                          if (c === '8')  defaultMil = '0.333';
                          const labor = parseFloat(editProductFormData.laborMilyem) || 0;
                          const baseMil = parseFloat(defaultMil) || 0;
                          setEditProductFormData({
                            ...editProductFormData,
                            carat: c,
                            costMilyem: defaultMil,
                            sellingMilyem: (baseMil + labor).toFixed(3)
                          });
                        }}
                        className={THEME.SELECT}
                      >
                        <option value="24">24 Ayar (Has)</option>
                        <option value="22">22 Ayar</option>
                        <option value="18">18 Ayar</option>
                        <option value="14">14 Ayar</option>
                        <option value="8">8 Ayar</option>
                      </select>
                    </div>

                    <div>
                      <label className={THEME.LABEL}>Geliş Milyemi *</label>
                      <input
                        type="number"
                        step="0.001"
                        required
                        placeholder="Örn: 0.585"
                        value={editProductFormData.costMilyem}
                        onChange={e => {
                          const val = e.target.value;
                          const c = parseFloat(val) || 0;
                          const l = parseFloat(editProductFormData.laborMilyem) || 0;
                          setEditProductFormData({
                            ...editProductFormData,
                            costMilyem: val,
                            sellingMilyem: (c + l).toFixed(3)
                          });
                        }}
                        className={THEME.INPUT}
                      />
                    </div>

                    {editProductFormData.laborType === 'milyem' ? (
                      <div>
                        <label className={THEME.LABEL}>Giriş İşçiliği (milyem) *</label>
                        <input
                          type="number"
                          step="0.001"
                          required
                          placeholder="Örn: 0.120"
                          value={editProductFormData.laborMilyem}
                          onChange={e => {
                            const val = e.target.value;
                            const c = parseFloat(editProductFormData.costMilyem) || 0;
                            const l = parseFloat(val) || 0;
                            setEditProductFormData({
                              ...editProductFormData,
                              laborMilyem: val,
                              sellingMilyem: (c + l).toFixed(3)
                            });
                          }}
                          className={THEME.INPUT}
                        />
                      </div>
                    ) : (
                      <div>
                        <label className={THEME.LABEL}>Kâr Marjı (%) *</label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          placeholder="Örn: 10"
                          value={editProductFormData.profitMargin}
                          onChange={e => {
                            const val = e.target.value;
                            const c = parseFloat(editProductFormData.costMilyem) || 0;
                            const p = parseFloat(val) || 0;
                            const calcSell = p > 0 ? c * (1 + p / 100) : c;
                            setEditProductFormData({
                              ...editProductFormData,
                              profitMargin: val,
                              sellingMilyem: calcSell.toFixed(3)
                            });
                          }}
                          className={THEME.INPUT}
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-yellow-400 font-bold text-xs uppercase tracking-wider block mb-1">
                        Satış Milyemi (Nihai) ⭐ *
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        required
                        placeholder="Örn: 0.931"
                        value={editProductFormData.sellingMilyem}
                        onChange={e => setEditProductFormData({ ...editProductFormData, sellingMilyem: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-gray-900 border-2 border-yellow-500/60 rounded-xl text-yellow-400 font-mono font-bold text-sm focus:outline-none focus:border-yellow-400 shadow-inner"
                      />
                    </div>
                  </div>

                  {/* FİZİKSEL ÖZELİKLER */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={THEME.LABEL}>Birim Ağırlığı (gr) *</label>
                      <input
                        type="number"
                        step="0.001"
                        required
                        placeholder="0.00 gr"
                        value={editProductFormData.weight}
                        onChange={e => setEditProductFormData({ ...editProductFormData, weight: e.target.value })}
                        className={THEME.INPUT}
                      />
                    </div>
                    <div>
                      <label className={THEME.LABEL}>Beden / Ölçü</label>
                      <input
                        type="text"
                        placeholder="Örn: 18, M, 54"
                        value={editProductFormData.size}
                        onChange={e => setEditProductFormData({ ...editProductFormData, size: e.target.value })}
                        className={THEME.INPUT}
                      />
                    </div>
                  </div>

                  {/* ANLIK MATEMATİKSEL RAPOR */}
                  {(() => {
                    const eCostMil = (parseFloat(editProductFormData.costMilyem) || 0) + (parseFloat(editProductFormData.laborMilyem) || 0);
                    const eSellMil = eCostMil * (1 + (parseFloat(editProductFormData.profitMargin) || 0) / 100);
                    const eWeight = parseFloat(editProductFormData.weight) || 0;
                    const eCostHas = eCostMil * eWeight;
                    const eSellHas = eSellMil * eWeight;
                    const eCostTL = (hasPrice?.bid || 0) * eCostHas;
                    const eSellTL = (hasPrice?.ask || 0) * eSellHas;

                    return (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-gray-900/50 border border-gray-800 p-4 rounded-xl text-center font-mono">
                        <div>
                          <p className="text-[10px] text-gray-500">Maliyet Milyem</p>
                          <p className="text-sm font-bold text-white">{eCostMil.toFixed(4)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500">Satış Milyem</p>
                          <p className="text-sm font-bold text-yellow-400">{eSellMil.toFixed(4)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-yellow-500/90 font-bold uppercase">Has Çarpanı</p>
                          <p className="text-sm font-extrabold text-yellow-400">{eSellHas.toFixed(3)} gr</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500">Maliyet (TL)</p>
                          <p className="text-sm font-bold text-emerald-400">
                            ₺{Math.round(eCostTL).toLocaleString('tr-TR')}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500">Tahmini Satış (TL)</p>
                          <p className="text-sm font-bold text-yellow-500">
                            ₺{Math.round(eSellTL).toLocaleString('tr-TR')}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* DETAY AÇIKLAMASI, DURUM VE ADET */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={THEME.LABEL}>Stok Durumu</label>
                    <select
                      value={editProductFormData.status}
                      onChange={e => setEditProductFormData({ ...editProductFormData, status: e.target.value })}
                      className={THEME.SELECT}
                    >
                      <option value="IN_STOCK">Stokta Var</option>
                      <option value="SOLD">Satıldı</option>
                      <option value="RESERVED">Rezerve</option>
                      <option value="OUT_OF_STOCK">Tükendi</option>
                    </select>
                  </div>
                  <div>
                    <label className={THEME.LABEL}>Miktar / Adet</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={editProductFormData.quantity}
                      onChange={e => setEditProductFormData({ ...editProductFormData, quantity: e.target.value })}
                      className={THEME.INPUT}
                    />
                  </div>
                  <div>
                    <label className={THEME.LABEL}>Açıklama</label>
                    <input
                      type="text"
                      placeholder="Raf yeri, özel notlar vb."
                      value={editProductFormData.description}
                      onChange={e => setEditProductFormData({ ...editProductFormData, description: e.target.value })}
                      className={THEME.INPUT}
                    />
                  </div>
                </div>

                {/* Form Butonları */}
                <div className="flex gap-3 pt-2 border-t border-gray-800/60">
                  <button type="submit" disabled={saving} className={`${THEME.BTN_PRIMARY} flex-1 justify-center py-3 text-sm`}>
                    {saving ? 'Güncelleniyor...' : 'Değişiklikleri Kaydet'}
                  </button>
                  <button type="button" onClick={() => setShowEditProductModal(false)} className={`${THEME.BTN_SECONDARY} py-3 text-sm`}>
                    İptal
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── KATEGORİ YÖNETİM MODALİ ─── */}
      <AnimatePresence>
        {showCategoryDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
                <h3 className="text-base font-bold text-white">Kategorileri Yönet</h3>
                <button onClick={() => setShowCategoryDialog(false)} className="text-gray-500 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Kategori Ekleme Formu */}
                <div className="space-y-2.5 bg-gray-950/40 p-3 rounded-xl border border-gray-850">
                  <p className="text-xs font-bold text-yellow-500 uppercase">Kategori Ekle</p>
                  <input
                    type="text"
                    placeholder="Kategori Adı (Örn: Bilezik)"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    className={THEME.INPUT}
                  />
                  <input
                    type="text"
                    placeholder="Barkod Kısaltma Kodu (Örn: BLZ)"
                    value={newCatCode}
                    onChange={e => setNewCatCode(e.target.value)}
                    className={`${THEME.INPUT} uppercase`}
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs rounded-lg transition-colors"
                  >
                    Kategori Kaydet
                  </button>
                </div>

                {/* Kategori Listesi */}
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  <p className="text-xs font-bold text-gray-500 uppercase">Kayıtlı Kategoriler</p>
                  {categories.map(c => (
                    <div key={c.id} className="flex justify-between items-center bg-gray-900 border border-gray-800 p-2.5 rounded-lg">
                      <div>
                        <span className="text-sm font-semibold text-white">{c.name}</span>
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-950 px-1.5 py-0.5 rounded border border-gray-850 ml-2">{c.code}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteCategory(c.id)}
                        className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── ALT KATEGORİ YÖNETİM MODALİ ─── */}
      <AnimatePresence>
        {showSubCategoryDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
                <div>
                  <h3 className="text-base font-bold text-white">Alt Kategorileri Yönet</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Kategori: <span className="text-yellow-500 font-bold">{productFormData.category}</span></p>
                </div>
                <button onClick={() => setShowSubCategoryDialog(false)} className="text-gray-500 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Alt Kategori Ekleme Formu */}
                <div className="space-y-2.5 bg-gray-950/40 p-3 rounded-xl border border-gray-850">
                  <p className="text-xs font-bold text-purple-400 uppercase">Alt Kategori Ekle</p>
                  <input
                    type="text"
                    placeholder="Alt Kategori Adı (Örn: Ajda, Adana Burma)"
                    value={newSubName}
                    onChange={e => setNewSubName(e.target.value)}
                    className={THEME.INPUT}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const activeCat = categories.find(c => c.name === productFormData.category);
                      if (activeCat) handleAddSubCategory(activeCat.id);
                    }}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg transition-colors"
                  >
                    Alt Kategori Kaydet
                  </button>
                </div>

                {/* Alt Kategori Listesi */}
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  <p className="text-xs font-bold text-gray-500 uppercase">Kayıtlı Alt Kategoriler</p>
                  {activeSubCategories.length === 0 ? (
                    <p className="text-xs text-gray-500 italic py-2">Henüz alt kategori eklenmemiş.</p>
                  ) : (
                    activeSubCategories.map((s: any) => (
                      <div key={s.id} className="flex justify-between items-center bg-gray-900 border border-gray-800 p-2.5 rounded-lg">
                        <span className="text-sm font-semibold text-white">{s.name}</span>
                        <button
                          onClick={() => handleDeleteSubCategory(s.id)}
                          className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── TOPTANCI (SUPPLIER) YÖNETİM MODALİ ─── */}
      <AnimatePresence>
        {showSupplierDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
                <h3 className="text-base font-bold text-white">Toptancıları Yönet</h3>
                <button onClick={() => setShowSupplierDialog(false)} className="text-gray-500 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Toptancı Ekleme Formu */}
                <div className="space-y-2.5 bg-gray-950/40 p-3 rounded-xl border border-gray-850">
                  <p className="text-xs font-bold text-emerald-400 uppercase">Toptancı Ekle</p>
                  <input
                    type="text"
                    placeholder="Toptancı Adı / Şirket Ünvanı"
                    value={newSupplierName}
                    onChange={e => setNewSupplierName(e.target.value)}
                    className={THEME.INPUT}
                  />
                  <button
                    type="button"
                    onClick={handleAddSupplier}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors"
                  >
                    Toptancı Kaydet
                  </button>
                </div>

                {/* Toptancı Listesi */}
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  <p className="text-xs font-bold text-gray-500 uppercase">Kayıtlı Toptancılar</p>
                  {suppliers.length === 0 ? (
                    <p className="text-xs text-gray-500 italic py-2">Henüz toptancı eklenmemiş.</p>
                  ) : (
                    suppliers.map(s => (
                      <div key={s.id} className="flex justify-between items-center bg-gray-900 border border-gray-800 p-2.5 rounded-lg">
                        <span className="text-sm font-semibold text-white">{s.name}</span>
                        <button
                          onClick={() => handleDeleteSupplier(s.id)}
                          className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── TEKLİ KELEBEK ETİKET MODALI ─── */}
      <KelebekLabelModal
        item={labelModalProduct}
        isOpen={!!labelModalProduct}
        onClose={() => setLabelModalProduct(null)}
        hasPrice={hasPrice}
      />

      {/* ─── TOPLU KELEBEK ETİKET MODALI ─── */}
      <BatchLabelPrintModal
        items={productItems.filter(p => selectedProductIds.includes(p.id))}
        isOpen={showBatchPrintModal}
        onClose={() => setShowBatchPrintModal(false)}
        hasPrice={hasPrice}
        onClearSelection={() => setSelectedProductIds([])}
      />

      {/* ─── SİPARİŞ TASLAĞI (REORDER DRAFT) MODALI ─── */}
      <ReorderDraftModal
        isOpen={showReorderModal}
        onClose={() => setShowReorderModal(false)}
        hasGoldPrice={hasPrice?.ask || 3000}
      />

      {/* ─── KAMERA BARKOD OKUYUCU MODAL ─── */}
      <CameraScannerModal
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScan={(scannedBarcode) => {
          setSearchQuery(scannedBarcode);
          setActiveView('barcode');
        }}
      />
    </>
  );
}


// Global scope support variable for typescript compilation
const error: string | null = null;

