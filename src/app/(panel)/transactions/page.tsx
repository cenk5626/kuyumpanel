'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeftRight,
  RefreshCw,
  CheckCircle,
  XCircle,
  Search,
  Plus,
  Trash2,
  Building,
  User as UserIcon,
  CreditCard,
  Printer,
  FileText,
  Delete,
  X,
  Coins,
  Keyboard,
  ChevronRight,
  Barcode,
  Camera,
  MessageSquare,
  Send,
  Filter,
  Eye,
  AlertTriangle,
  Receipt
} from 'lucide-react';
import Link from 'next/link';
import { MESSAGES } from '@/constants/messages';
import { ROUTES } from '@/constants/routes';
import { THEME, ANIM } from '@/constants/theme';
import { PAYMENT_METHODS } from '@/constants/kasa';
import HeaderActions from '@/components/HeaderActions';
import CameraScannerModal from '@/components/CameraScannerModal';
import POSTransactionReceiptModal, { ReceiptData } from '@/components/POSTransactionReceiptModal';
import { generateWhatsAppReceiptUrl } from '@/lib/whatsapp';


// ─── Sabitler ─────────────────────────────────────────────────────────────────

const PRODUCT_OPTIONS: Array<{
  code: string;
  label: string;
  type: 'sarrafiye' | 'döviz';
  livePriceId: string;
}> = [
  { code: 'ECEYREKTL', label: 'Çeyrek Altın',        type: 'sarrafiye', livePriceId: 'ECEYREKTL' },
  { code: 'EYARIMTL',  label: 'Yarım Altın',          type: 'sarrafiye', livePriceId: 'EYARIMTL'  },
  { code: 'ETAMTL',    label: 'Tam Altın',             type: 'sarrafiye', livePriceId: 'ETAMTL'    },
  { code: 'EATATL',    label: 'Ata Altın',             type: 'sarrafiye', livePriceId: 'EATATL'    },
  { code: 'EGREMSETL', label: 'Gremse Altın',          type: 'sarrafiye', livePriceId: 'EGREMSETL' },
  { code: 'mil24Ayar', label: '24 Ayar Gram',          type: 'sarrafiye', livePriceId: 'mil24Ayar' },
  { code: 'mil22Ayar', label: '22 Ayar Gram',          type: 'sarrafiye', livePriceId: 'mil22Ayar' },
  { code: 'milAdanaBurma', label: 'Adana-Burma Bilezik', type: 'sarrafiye', livePriceId: 'milAdanaBurma' },
  { code: 'milAjda',   label: 'Ajda Bilezik',          type: 'sarrafiye', livePriceId: 'milAjda'   },
  { code: 'mil14Ayar', label: '14 Ayar Gram',          type: 'sarrafiye', livePriceId: 'mil14Ayar' },
  { code: 'USD',       label: 'Amerikan Doları (USD)', type: 'döviz',     livePriceId: 'USDTRY'    },
  { code: 'EUR',       label: 'Euro (EUR)',             type: 'döviz',     livePriceId: 'EURTRY'    },
];

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface LivePrice {
  id: string;
  label: string;
  bid: number;
  ask: number;
  updatedAt: string;
}

interface Stock {
  id: string;
  label: string;
  type: string;
  amount: number;
}

interface Transaction {
  id: string;
  type: string;
  productType: string;
  productCode: string;
  quantity: number;
  price: number;
  total: number;
  costPrice?: number | null;
  profitAmount?: number | null;
  profitMargin?: number | null;
  isSuspicious?: boolean;
  suspiciousReason?: string | null;
  paymentMethod?: string;
  employeeName?: string | null;
  orderNote?: string | null;
  createdAt: string;
}

interface BasketItem {
  id: string;
  type: 'buy' | 'sell';
  productType: 'sarrafiye' | 'döviz';
  productCode: string; // boş ise "Ürün Seçin"
  quantity: number;
  price: number;
  total: number;
  barcodeDetail?: {
    id: string;
    title: string;
    carat: number;
    weight: number;
    laborType: string;
    laborCost: number;
    costMilyem?: number;
    laborMilyem?: number;
    sellingMilyem?: number;
    profitMargin?: number;
    costPrice?: number;
    supplierName?: string;
  };
}

interface NumpadState {
  targetType: 'row-price' | 'row-qty' | 'paid-amount';
  rowId?: string;
  title: string;
  value: string;
}

interface DBUser {
  id: string;
  name: string;
  role: string;
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  // Veri state
  const [livePrices, setLivePrices] = useState<Record<string, LivePrice>>({});
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Kasiyer / Personel filtreleme ve seçici state'leri
  const [personnels, setPersonnels] = useState<DBUser[]>([]);
  const [activePersonnel, setActivePersonnel] = useState<string>('');
  const [loggedInAdminName, setLoggedInAdminName] = useState('Yönetici');

  // Klavye Kilidi (Tabletler için varsayılan olarak aktif/açık)
  const [isKeyboardLocked, setIsKeyboardLocked] = useState(true);

  // POS Sepeti
  const [basket, setBasket] = useState<BasketItem[]>([]);

  // Numaratör (Numpad) Modal state
  const [numpad, setNumpad] = useState<NumpadState | null>(null);

  // Sağ Kolon Form state'leri
  const [paidAmount, setPaidAmount] = useState<string>('0,00');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'card'>('cash');
  const [cardFeePercent, setCardFeePercent] = useState<string>('5'); // Standart olarak %5
  const [orderNote, setOrderNote] = useState<string>('');

  // Ana Tab Seçici (Hızlı POS Satış vs Geçmiş İşlemler & Kâr/Zarar)
  const [activeMainTab, setActiveMainTab] = useState<'pos' | 'history'>('pos');
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'ALL' | 'SELL' | 'BUY' | 'SUSPICIOUS'>('ALL');

  // Termal Fiş Yazdırma Modalı
  const [receiptModalData, setReceiptModalData] = useState<ReceiptData | null>(null);

  // İşlem Düzenleme & Silme Modal State'leri
  const [editTxModal, setEditTxModal] = useState<Transaction | null>(null);
  const [editTxForm, setEditTxForm] = useState({
    quantity: '',
    price: '',
    paymentMethod: 'CASH',
    reason: '',
  });
  const [deleteTxModal, setDeleteTxModal] = useState<Transaction | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Modaller
  const [activeRowIdForModal, setActiveRowIdForModal] = useState<string | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error', duration = 3000) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), duration);
  };

  // Dinamik Para / Fiyat Biçimlendirici (Sarrafiye: tam sayı, Döviz: 2 hane)
  const formatValue = (val: number, type: 'sarrafiye' | 'döviz') => {
    if (type === 'sarrafiye') {
      return Math.round(val).toLocaleString('tr-TR', { maximumFractionDigits: 0 });
    } else {
      return val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  };

  const fetchAll = useCallback(async () => {
    try {
      const [liveRes, stocksRes, txRes, employeesRes, sessionRes] = await Promise.all([
        fetch(ROUTES.API_PRICES_LIVE),
        fetch(ROUTES.API_STOCKS),
        fetch(ROUTES.API_TRANSACTIONS),
        fetch('/api/employees'),
        fetch('/api/auth/session'),
      ]);
      
      const [liveData, stocksData, txData, employeesData, sessionData] = await Promise.all([
        liveRes.json(),
        stocksRes.json(),
        txRes.json(),
        employeesRes.json(),
        sessionRes.json(),
      ]);

      const liveMap: Record<string, LivePrice> = {};
      if (Array.isArray(liveData)) {
        (liveData as LivePrice[]).forEach(item => { liveMap[item.id] = item; });
      }
      setLivePrices(liveMap);
      setStocks(stocksData as Stock[]);
      setTransactions(txData as Transaction[]);

      // Çalışanları personnels listesine aktar
      if (Array.isArray(employeesData)) {
        setPersonnels(employeesData);
        if (employeesData.length > 0) {
          setActivePersonnel(employeesData[0].name);
        }
      }

      if (sessionData?.user?.name) {
        setLoggedInAdminName(sessionData.user.name);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Yeni boş/başlangıç işlem satırı ekle (Seçili ürün yok)
  const handleAddRow = useCallback(() => {
    const newItem: BasketItem = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'sell',
      productType: 'sarrafiye',
      productCode: '', // Başlangıçta boş (Ürün Seçin)
      quantity: 1,
      price: 0,
      total: 0,
    };

    setBasket(prev => [...prev, newItem]);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Canlı fiyatlar yüklendikten sonra sepet boşsa otomatik ilk boş satırı ekle
  useEffect(() => {
    if (!loading && basket.length === 0 && Object.keys(livePrices).length > 0) {
      handleAddRow();
    }
  }, [loading, livePrices, basket.length, handleAddRow]);

  // Sepetteki bir satırı sil
  const handleRemoveRow = (id: string) => {
    setBasket(prev => prev.filter(item => item.id !== id));
  };

  // Sepetteki bir satırın alanlarını güncelle
  const handleUpdateRowField = (id: string, field: keyof BasketItem, value: any) => {
    setBasket(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };

      // Ürün veya İşlem Yönü değiştiğinde fiyatı otomatik canlı fiyata güncelle
      if (field === 'productCode' || field === 'type') {
        if (!updated.productCode) {
          updated.price = 0;
          updated.total = 0;
          return updated;
        }
        const prod = PRODUCT_OPTIONS.find(p => p.code === updated.productCode)!;
        updated.productType = prod.type;
        const liveP = livePrices[prod.livePriceId];
        const sugPrice = updated.type === 'buy' ? liveP?.bid : liveP?.ask;
        updated.price = sugPrice || 0;
      }

      updated.total = updated.quantity * updated.price;
      return updated;
    }));
  };

  // Numaratörü Açma
  const openNumpad = (targetType: 'row-price' | 'row-qty' | 'paid-amount', rowId?: string, currentValue?: number) => {
    let strVal = '';
    if (currentValue != null && currentValue > 0) {
      strVal = String(currentValue).replace('.', ',');
    }
    setNumpad({
      targetType,
      rowId,
      title: targetType === 'row-price' ? 'Birim Fiyat' : targetType === 'row-qty' ? 'Miktar' : 'Ödenen Tutar',
      value: strVal,
    });
  };

  // Giriş Alanı Tıklama Kontrolü (Klavye Kilidi aktifse Numaratörü açar)
  const handleInputClick = (
    e: React.MouseEvent<HTMLInputElement>,
    targetType: 'row-price' | 'row-qty' | 'paid-amount',
    rowId?: string,
    currentValue?: number
  ) => {
    if (isKeyboardLocked) {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
      openNumpad(targetType, rowId, currentValue);
    }
  };

  // Numaratör Tuş Vuruşu
  const handleNumpadKeyPress = (key: string) => {
    if (!numpad) return;
    let nextVal = numpad.value;
    if (key === ',') {
      if (!nextVal.includes(',')) {
        nextVal = nextVal === '' ? '0,' : nextVal + ',';
      }
    } else if (key === '00') {
      nextVal = nextVal === '' ? '0' : nextVal + '00';
    } else {
      nextVal = nextVal === '' ? key : nextVal + key;
    }
    setNumpad(prev => prev ? { ...prev, value: nextVal } : null);
  };

  // Numaratör Geri Silme
  const handleNumpadBackspace = () => {
    if (!numpad) return;
    const nextVal = numpad.value.slice(0, -1);
    setNumpad(prev => prev ? { ...prev, value: nextVal } : null);
  };

  // Numaratör Fiyat Yuvarlama Düğmeleri (5 TL katlarına)
  const handleNumpadRound = (direction: 'up' | 'down') => {
    if (!numpad) return;
    const currentVal = parseFloat(numpad.value.replace(',', '.')) || 0;
    if (currentVal <= 0) return;
    let newVal = currentVal;
    if (direction === 'up') {
      newVal = currentVal % 5 === 0 ? currentVal + 5 : Math.ceil(currentVal / 5) * 5;
    } else {
      newVal = currentVal % 5 === 0 ? currentVal - 5 : Math.floor(currentVal / 5) * 5;
    }
    setNumpad(prev => prev ? { ...prev, value: String(newVal).replace('.', ',') } : null);
  };

  // Numaratör Onaylama (Tamam)
  const handleNumpadSubmit = () => {
    if (!numpad) return;
    const parsedVal = parseFloat(numpad.value.replace(',', '.')) || 0;

    if (numpad.targetType === 'row-price' && numpad.rowId) {
      handleUpdateRowField(numpad.rowId, 'price', parsedVal);
    } else if (numpad.targetType === 'row-qty' && numpad.rowId) {
      handleUpdateRowField(numpad.rowId, 'quantity', parsedVal);
    } else if (numpad.targetType === 'paid-amount') {
      setPaidAmount(numpad.value || '0,00');
    }

    setNumpad(null);
  };

  // Numaratör Ekranı Anlık Biçimlendirici
  const formatNumpadDisplay = (val: string, targetType: string, rowId?: string) => {
    if (!val) return '0';
    if (targetType === 'row-qty') return val;
    const parts = val.split(',');
    const integerPart = parseFloat(parts[0]) || 0;
    const formattedInteger = integerPart.toLocaleString('tr-TR', { maximumFractionDigits: 0 });
    if (parts.length > 1) {
      return `${formattedInteger},${parts[1]}`;
    }
    return formattedInteger;
  };

  // Modal ile ürün seçilince tetiklenecek
  const handleSelectProductFromModal = (code: string) => {
    if (activeRowIdForModal) {
      handleUpdateRowField(activeRowIdForModal, 'productCode', code);
      setIsProductModalOpen(false);
      setActiveRowIdForModal(null);
    }
  };

  // Sepeti API üzerinden kaydet
  const handleSaveTransactions = async () => {
    const validItems = basket.filter(item => item.productCode !== '');
    if (validItems.length === 0) {
      showToast('Sepetiniz boş veya ürün seçilmemiş!', 'error');
      return;
    }
    setSubmitting(true);
    const normalizedPaymentMethod =
      paymentMethod === 'card'
        ? PAYMENT_METHODS.CARD
        : paymentMethod === 'bank'
        ? PAYMENT_METHODS.BANK
        : PAYMENT_METHODS.CASH;

    const feePercentNum = paymentMethod === 'card' ? (parseFloat(cardFeePercent) || null) : null;

    try {
      const res = await fetch(ROUTES.API_TRANSACTIONS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validItems.map(item => ({
          type: item.type,
          productType: item.productType,
          productCode: item.productCode,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
          paymentMethod: normalizedPaymentMethod,
          cardFeePercent: feePercentNum,
          orderNote: orderNote.trim() || null,
          employeeName: activePersonnel || null,
        }))),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? 'İşlemler kaydedilemedi.', 'error');
      } else {
        showToast(`✓ ${validItems.length} adet işlem başarıyla kaydedildi.`, 'success');
        setBasket([]);
        setOrderNote('');
        setPaidAmount('0,00');
        await fetchAll();
      }
    } catch (e) {
      console.error(e);
      showToast('Ağ hatası oluştu.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Fiş yazdır tetikleyicisi
  const handlePrintReceipt = () => {
    const validItems = basket.filter(item => item.productCode !== '');
    if (validItems.length === 0) {
      showToast('Sepette yazdırılacak ürün bulunmuyor!', 'error');
      return;
    }

    const receiptItems = validItems.map(item => {
      const prodOption = PRODUCT_OPTIONS.find(p => p.code === item.productCode);
      return {
        code: item.productCode,
        title: item.barcodeDetail?.title || prodOption?.label || item.productCode,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        carat: item.barcodeDetail?.carat || (item.productCode.includes('22') ? 22 : item.productCode.includes('14') ? 14 : item.productCode.includes('24') ? 24 : undefined),
        weight: item.barcodeDetail?.weight,
        type: item.type,
      };
    });

    const hasGoldPrice = getHasPrice('sell') || 3000;
    const totalHas = basketTotal / hasGoldPrice;

    setReceiptModalData({
      receiptNo: `KP-${Date.now().toString().slice(-6)}`,
      date: new Date(),
      customerName: orderNote.trim() || undefined,
      employeeName: activePersonnel || loggedInAdminName,
      paymentMethod: paymentMethod === 'card' ? `Kredi Kartı (+%${feePercent})` : paymentMethod === 'bank' ? 'Banka / FAST' : 'Nakit',
      items: receiptItems,
      subTotal: netTotal,
      feeAmount: feePercent > 0 ? (netTotal * feePercent / 100) : 0,
      total: basketTotal,
      totalHas,
      isInfoOnly: false,
    });
  };

  // Bilgi fişi tetikleyicisi
  const handlePrintInfo = () => {
    const validItems = basket.filter(item => item.productCode !== '');
    if (validItems.length === 0) {
      showToast('Sepette ürün bulunmuyor!', 'error');
      return;
    }

    const receiptItems = validItems.map(item => {
      const prodOption = PRODUCT_OPTIONS.find(p => p.code === item.productCode);
      return {
        code: item.productCode,
        title: item.barcodeDetail?.title || prodOption?.label || item.productCode,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        carat: item.barcodeDetail?.carat || (item.productCode.includes('22') ? 22 : item.productCode.includes('14') ? 14 : item.productCode.includes('24') ? 24 : undefined),
        weight: item.barcodeDetail?.weight,
        type: item.type,
      };
    });

    const hasGoldPrice = getHasPrice('sell') || 3000;
    const totalHas = basketTotal / hasGoldPrice;

    setReceiptModalData({
      receiptNo: `INF-${Date.now().toString().slice(-6)}`,
      date: new Date(),
      customerName: orderNote.trim() || undefined,
      employeeName: activePersonnel || loggedInAdminName,
      paymentMethod: paymentMethod === 'card' ? `Kredi Kartı (+%${feePercent})` : paymentMethod === 'bank' ? 'Banka / FAST' : 'Nakit',
      items: receiptItems,
      subTotal: netTotal,
      feeAmount: feePercent > 0 ? (netTotal * feePercent / 100) : 0,
      total: basketTotal,
      totalHas,
      isInfoOnly: true,
    });
  };

  // Geçmiş İşlemden Fiş Yazdır
  const handlePrintHistoricalTxReceipt = (tx: Transaction) => {
    const prodOption = PRODUCT_OPTIONS.find(p => p.code === tx.productCode);
    setReceiptModalData({
      receiptNo: `TX-${tx.id.slice(-6).toUpperCase()}`,
      date: tx.createdAt,
      customerName: tx.orderNote || undefined,
      employeeName: tx.employeeName || 'Kasiyer',
      paymentMethod: tx.paymentMethod === 'CARD' ? 'Kredi Kartı' : tx.paymentMethod === 'BANK' ? 'Banka / FAST' : tx.paymentMethod === 'DEBT' ? 'Veresiye' : 'Nakit',
      items: [{
        code: tx.productCode,
        title: prodOption?.label || tx.productCode,
        quantity: tx.quantity,
        price: tx.price,
        total: tx.total,
        type: tx.type as any,
      }],
      subTotal: tx.total,
      total: tx.total,
      isInfoOnly: false,
    });
  };

  // İşlem Düzenleme Aç
  const handleOpenEditModal = (tx: Transaction) => {
    setEditTxModal(tx);
    setEditTxForm({
      quantity: String(tx.quantity),
      price: String(tx.price),
      paymentMethod: tx.paymentMethod || 'CASH',
      reason: '',
    });
  };

  // İşlem Düzenlemeyi Kaydet
  const handleSaveEditTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTxModal) return;
    if (!editTxForm.reason.trim()) {
      alert('Lütfen düzenleme gerekçesini yazın.');
      return;
    }
    const q = parseFloat(editTxForm.quantity);
    const p = parseFloat(editTxForm.price);
    if (isNaN(q) || q <= 0 || isNaN(p) || p <= 0) {
      alert('Geçerli bir miktar ve birim fiyat girin.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editTxModal.id,
          quantity: q,
          price: p,
          total: q * p,
          paymentMethod: editTxForm.paymentMethod,
          reason: editTxForm.reason.trim(),
        }),
      });

      if (res.ok) {
        showToast('✓ İşlem başarıyla güncellendi ve stok farkı uygulandı.', 'success');
        setEditTxModal(null);
        await fetchAll();
      } else {
        const err = await res.json();
        alert(err.error || 'İşlem güncellenemedi.');
      }
    } catch (e) {
      console.error(e);
      alert('Bağlantı hatası.');
    } finally {
      setActionLoading(false);
    }
  };

  // İşlem Silme / İptal Aç
  const handleOpenDeleteModal = (tx: Transaction) => {
    setDeleteTxModal(tx);
    setDeleteReason('');
  };

  // İşlem İptalini Onayla
  const handleConfirmDeleteTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteTxModal) return;
    if (!deleteReason.trim()) {
      alert('Lütfen iptal gerekçesini belirtin.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/transactions?id=${deleteTxModal.id}&reason=${encodeURIComponent(deleteReason.trim())}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showToast('✓ İşlem iptal edildi ve stok iadesi yapıldı.', 'success');
        setDeleteTxModal(null);
        await fetchAll();
      } else {
        const err = await res.json();
        alert(err.error || 'İşlem silinemedi.');
      }
    } catch (e) {
      console.error(e);
      alert('Bağlantı hatası.');
    } finally {
      setActionLoading(false);
    }
  };

  // WhatsApp Fiş Gönder tetikleyicisi
  const handleSendWhatsAppReceipt = (phone?: string) => {
    const validItems = basket.filter(item => item.productCode !== '');
    if (validItems.length === 0) {
      showToast('Sepette ürün bulunmuyor!', 'error');
      return;
    }
    const receiptItems = validItems.map(item => {
      const prodOption = PRODUCT_OPTIONS.find(p => p.code === item.productCode);
      const title = item.barcodeDetail?.title || prodOption?.label || item.productCode;
      return {
        title,
        carat: item.barcodeDetail?.carat || (item.productCode.includes('22') ? 22 : item.productCode.includes('14') ? 14 : item.productCode.includes('24') ? 24 : undefined),
        weight: item.barcodeDetail?.weight,
        priceTL: item.total,
        quantity: item.quantity,
      };
    });
    const url = generateWhatsAppReceiptUrl({
      phone: phone || null,
      customerName: orderNote.trim() || 'Değerli Müşterimiz',
      items: receiptItems,
      totalTL: basketTotal,
      paymentMethod: paymentMethod === 'card' ? 'Kredi Kartı' : paymentMethod === 'bank' ? 'Banka Havalesi' : 'Nakit',
      employeeName: activePersonnel || loggedInAdminName,
    });
    window.open(url, '_blank');
  };


  // Has fiyatını al
  const getHasPrice = (type: 'buy' | 'sell') => {
    const gold24 = livePrices['mil24Ayar'] || livePrices['GAUTRY'];
    if (!gold24) return 0;
    return type === 'buy' ? gold24.bid : gold24.ask;
  };

  // Barkod arama ve sepete ekleme işlemi
  const handleBarcodeSearch = async (code: string) => {
    if (!code) return;
    try {
      const res = await fetch(`/api/products?barcode=${code}`);
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Barkod bulunamadı.', 'error');
        setBarcodeQuery('');
        return;
      }

      if (data.status === 'SOLD') {
        showToast(`Bu ürün daha önce satılmış (${data.barcode})`, 'error');
        setBarcodeQuery('');
        return;
      }

      const hasPrice = getHasPrice('sell');
      
      const costMilyem = data.costMilyem || (data.carat === 22 ? 0.916 : data.carat === 14 ? 0.585 : data.carat / 24);
      const laborMilyem = data.laborMilyem || 0;
      const sellingMilyem = data.sellingMilyem != null && data.sellingMilyem > 0
        ? data.sellingMilyem
        : (data.profitMargin && data.profitMargin > 0 ? (costMilyem + laborMilyem) * (1 + data.profitMargin / 100) : (costMilyem + laborMilyem));
      
      const unitPrice = hasPrice * sellingMilyem * data.weight;

      // Sepette zaten var mı kontrol et
      const exists = basket.find(item => item.productCode === data.barcode);
      if (exists) {
        showToast('Bu barkodlu ürün zaten sepette!', 'error');
        setBarcodeQuery('');
        return;
      }

      const newItem: BasketItem = {
        id: Math.random().toString(36).substring(7),
        type: 'sell',
        productType: 'sarrafiye',
        productCode: data.barcode,
        quantity: 1,
        price: Math.round(unitPrice),
        total: Math.round(unitPrice),
        barcodeDetail: {
          id: data.id,
          title: data.category || data.title || 'Takı Ürünü',
          carat: data.carat,
          weight: data.weight,
          laborType: data.laborType,
          laborCost: data.laborCost,
          costMilyem,
          laborMilyem,
          sellingMilyem,
          profitMargin: data.profitMargin,
          costPrice: data.costPrice,
          supplierName: data.supplierName
        }
      };

      setBasket(prev => [...prev, newItem]);
      showToast(`✓ ${newItem.barcodeDetail?.title} sepete eklendi.`, 'success');
      setBarcodeQuery('');
    } catch (e) {
      console.error(e);
      showToast('Ağ hatası oluştu.', 'error');
      setBarcodeQuery('');
    }
  };

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBarcodeSearch(barcodeQuery);
    }
  };

  // Global barkod okuyucu (fiziksel scanner) dinleyicisi
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.tagName === 'SELECT'
      ) {
        return;
      }

      const currentTime = Date.now();

      if (currentTime - lastKeyTime > 50) {
        buffer = '';
      }

      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length > 2) {
          handleBarcodeSearch(buffer);
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [basket, livePrices]);

  // Tutar hesaplama yardımları
  const totalSales = basket.filter(i => i.type === 'sell').reduce((sum, i) => sum + i.total, 0);
  const totalPurchases = basket.filter(i => i.type === 'buy').reduce((sum, i) => sum + i.total, 0);
  const netTotal = totalSales - totalPurchases;

  // K.K. Seçildiğinde %5 (veya elle girilen oran) ekle
  const feePercent = paymentMethod === 'card' ? (parseFloat(cardFeePercent) || 0) : 0;
  const netTotalWithFee = netTotal * (1 + feePercent / 100);
  const basketTotal = Math.abs(netTotalWithFee);

  // Filtrelenmiş ürün listesi (Modal için)
  const filteredProducts = PRODUCT_OPTIONS.filter(p =>
    p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Toast / Bildirim Modalı (Ekranın Ortasında) */}
      <AnimatePresence>
        {toast && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -15 }}
              className={`relative px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center gap-3 border backdrop-blur-md pointer-events-auto min-w-[300px] max-w-sm ${
                toast.type === 'success'
                  ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-300 shadow-emerald-950/50'
                  : 'bg-red-950/95 border-red-500/40 text-red-300 shadow-red-950/50'
              }`}
            >
              <div className={`p-4 rounded-full ${
                toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
              }`}>
                {toast.type === 'success' ? <Printer size={40} className="animate-bounce" /> : <XCircle size={40} />}
              </div>
              <span className="text-base font-extrabold text-center tracking-wide mt-1">
                {toast.msg}
              </span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POS ÜST BAR / BİLGİ ALANI */}
      <header className={`${THEME.HEADER} flex justify-between items-center w-full flex-wrap gap-4 py-4 px-6`}>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Başlık */}
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Coins className="text-yellow-500 animate-pulse" size={24} />
            Ürün Listesi
          </h1>
          {/* Klavye Kilidi Düğmesi (Tıklanabilir) */}
          <button
            onClick={() => setIsKeyboardLocked(!isKeyboardLocked)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
              isKeyboardLocked
                ? 'bg-amber-500 text-black hover:bg-amber-400'
                : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700/60'
            }`}
          >
            <Keyboard size={14} />
            Klavye Kilidi: {isKeyboardLocked ? 'Açık' : 'Kapalı'}
          </button>
          {/* Kasiyer / Personel Seçici Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold">
            <UserIcon size={14} />
            <select
              value={activePersonnel}
              onChange={e => setActivePersonnel(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer border-none p-0 text-xs"
            >
              {personnels.map(u => (
                <option key={u.id} value={u.name} className="bg-gray-900 text-white">
                  {u.name}
                </option>
              ))}
              {personnels.length === 0 && (
                <option value={loggedInAdminName}>{loggedInAdminName}</option>
              )}
            </select>
          </div>
        </div>

        {/* Sağ Üst Kontroller */}
        <div className="flex items-center gap-3">
          {/* Tutar Arama Girişi */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input
              type="text"
              placeholder="Tutar..."
              className="w-36 pl-8 pr-3 py-2 bg-gray-800/80 border border-gray-700/60 rounded-xl text-white text-xs focus:outline-none focus:border-yellow-500/50 transition-all font-mono text-right"
            />
          </div>

          {/* Kasa Butonu */}
          <Link
            href={ROUTES.Z_REPORT}
            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Building size={14} />
            Kasa
          </Link>

          {/* Yeni Satır Ekle Butonu */}
          <button
            onClick={handleAddRow}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-500/10"
          >
            <Plus size={14} />
            Ürün Ekle
          </button>

          <HeaderActions />
        </div>
      </header>

      {/* 2'Lİ ANA TAB SEÇİCİ BANNER */}
      <div className="px-6 pt-4 pb-0 flex items-center justify-between flex-wrap gap-3">
        <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-amber-500/20 shadow-xl backdrop-blur-md w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveMainTab('pos')}
            className={`flex-1 sm:flex-initial py-2.5 px-6 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
              activeMainTab === 'pos'
                ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Coins size={16} /> 1. Hızlı POS Satış Masası
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('history')}
            className={`flex-1 sm:flex-initial py-2.5 px-6 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
              activeMainTab === 'history'
                ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 scale-[1.02]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <ArrowLeftRight size={16} /> 2. Geçmiş İşlemler & Kâr/Zarar ({transactions.length})
          </button>
        </div>

        {activeMainTab === 'history' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-400/90 font-bold hidden md:inline-flex items-center gap-1">
              <CheckCircle size={14} /> Otomatik Kâr/Zarar ve Stok Senkronizasyonu Aktif
            </span>
          </div>
        )}
      </div>

      {/* POS ANA ALAN */}
      {activeMainTab === 'pos' && (
      <div className="p-6 flex flex-col gap-6 w-full max-w-[1920px] mx-auto">
        {/* Barkod Giriş ve Arama Alanı */}
        <div className={`${THEME.GLASS_CARD} p-4 flex items-center gap-3 flex-wrap sm:flex-nowrap`}>
          <div className="relative flex-1 min-w-[240px]">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Barcode className="text-yellow-500" size={18} />
            </span>
            <input
              type="text"
              value={barcodeQuery}
              onChange={e => setBarcodeQuery(e.target.value)}
              onKeyDown={handleBarcodeKeyDown}
              placeholder="Barkod okutun (Örn: K000001) veya manuel yazıp Enter'a basın..."
              className="w-full pl-10 pr-4 py-3 bg-gray-950/60 border border-gray-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition-colors font-mono"
            />
          </div>
          <button
            onClick={() => handleBarcodeSearch(barcodeQuery)}
            className="px-5 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm rounded-xl transition-all shadow-lg shadow-yellow-500/10 flex items-center gap-2 shrink-0"
          >
            <Search size={16} /> Barkod Ara
          </button>

          <button
            onClick={() => setIsCameraModalOpen(true)}
            className="px-5 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 shrink-0"
          >
            <Camera size={18} /> Kamera İle Oku
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* === SOL SUTUN: ISLEM SATIRLARI (Sepet) === */}
          <div className="xl:col-span-2 flex flex-col gap-4">
            {basket.length === 0 ? (
              <div className={`${THEME.GLASS_CARD} p-12 text-center text-gray-500 text-sm font-semibold`}>
                İşlem sepeti boş. Başlamak için sağ üstten "+ Ürün Ekle" butonuna basın.
              </div>
            ) : (
              basket.map((item) => {
                const prodOption = PRODUCT_OPTIONS.find(p => p.code === item.productCode);
                const liveP = prodOption ? livePrices[prodOption.livePriceId] : null;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${THEME.GLASS_CARD} p-5 flex flex-wrap lg:flex-nowrap items-center justify-between gap-6 border ${
                      item.type === 'buy' ? 'border-emerald-500/20' : 'border-yellow-900/15'
                    }`}
                  >
                    {/* 1. Ürün Seçimi */}
                    <div className="flex-1 min-w-[160px] flex flex-col gap-1">
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Ürün:</label>
                      {item.productCode && (item.productCode.startsWith('K') || item.barcodeDetail) ? (
                        <div className="py-2 px-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                          <p className="text-yellow-400 font-bold text-xs flex items-center gap-1.5 font-mono">
                            <Barcode size={14} /> {item.productCode}
                          </p>
                          <p className="text-white text-xs mt-1 font-semibold">{item.barcodeDetail?.title || 'Barkodlu Ürün'}</p>
                          <p className="text-gray-400 text-[10px] mt-0.5 font-mono">
                            {item.barcodeDetail?.carat} Ayar • {item.barcodeDetail?.weight} gr
                            {item.barcodeDetail?.costMilyem != null && (
                              <span className="text-yellow-400 font-bold ml-1.5 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">
                                {(() => {
                                  const costMil = item.barcodeDetail.costMilyem || 0;
                                  const laborMil = item.barcodeDetail.laborMilyem || 0;
                                  const sellMil = item.barcodeDetail.sellingMilyem != null && item.barcodeDetail.sellingMilyem > 0
                                    ? item.barcodeDetail.sellingMilyem
                                    : (costMil + laborMil);
                                  return (sellMil * item.barcodeDetail.weight).toFixed(3);
                                })()} gr Has
                              </span>
                            )}
                          </p>
                        </div>
                      ) : (
                        <>
                          <select
                            value={item.productCode}
                            onChange={e => handleUpdateRowField(item.id, 'productCode', e.target.value)}
                            className="w-full px-3 py-2 bg-gray-950/60 border border-gray-800 rounded-xl text-white text-xs focus:outline-none focus:border-yellow-500/50 appearance-none font-semibold"
                          >
                            <option value="">Ürün Seçin</option>
                            {PRODUCT_OPTIONS.map(p => (
                              <option key={p.code} value={p.code}>{p.label}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveRowIdForModal(item.id);
                              setIsProductModalOpen(true);
                            }}
                            className="w-full py-1.5 bg-gray-950/30 hover:bg-gray-950/50 border border-gray-800/80 rounded-lg text-[10px] text-gray-400 font-bold flex items-center justify-center gap-1.5 mt-1 transition-colors"
                          >
                            <Search size={10} />
                            Modal ile Seç
                          </button>
                        </>
                      )}
                    </div>

                    {/* 2. İşlem Yönü */}
                    <div className="w-24 flex flex-col gap-1">
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">İşlem Tipi:</label>
                      <select
                        value={item.type}
                        onChange={e => handleUpdateRowField(item.id, 'type', e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-bold text-white border focus:outline-none cursor-pointer transition-colors ${
                          item.type === 'buy'
                            ? 'bg-emerald-800/90 border-emerald-700/80 text-emerald-100'
                            : 'bg-red-800/90 border-red-700/80 text-red-100'
                        }`}
                      >
                        <option value="sell">Satış</option>
                        <option value="buy">Alış</option>
                      </select>
                    </div>

                    {/* 3. Miktar */}
                    <div className="w-16 flex flex-col gap-1">
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Miktar:</label>
                      <input
                        type={isKeyboardLocked ? "text" : "number"}
                        step="0.01"
                        min="0.01"
                        readOnly={isKeyboardLocked}
                        value={item.quantity}
                        onClick={e => handleInputClick(e, 'row-qty', item.id, item.quantity)}
                        onChange={e => handleUpdateRowField(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-gray-950/60 border border-gray-800 rounded-xl text-white text-xs font-mono text-center focus:outline-none focus:border-yellow-500/50"
                      />
                    </div>

                    {/* 4. Birim Fiyat */}
                    <div className="flex-1 min-w-[140px] flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Birim Fiyat:</label>
                        {liveP && (
                          <span className="text-[9px] text-gray-550 font-mono">
                            Ref: ₺{formatValue(item.type === 'buy' ? liveP.bid : liveP.ask, item.productType)}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1.5 relative">
                        <input
                          type={isKeyboardLocked ? "text" : "number"}
                          step="1"
                          readOnly={isKeyboardLocked}
                          value={item.productCode ? (isKeyboardLocked ? formatValue(item.price, item.productType) : item.price) : ''}
                          onClick={e => handleInputClick(e, 'row-price', item.id, item.price)}
                          onChange={e => handleUpdateRowField(item.id, 'price', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-gray-950/60 border border-gray-800 rounded-xl text-emerald-400 font-bold font-mono text-right text-xs focus:outline-none focus:border-yellow-500/50 pr-8"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-mono font-semibold">₺</span>
                      </div>
                    </div>

                    {/* 5. Toplam Tutar */}
                    <div className="w-28 flex flex-col gap-1 text-right">
                      <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Toplam:</label>
                      <span className="text-base font-black font-mono leading-7 text-emerald-400">
                        ₺{item.productCode ? formatValue(item.total, item.productType) : '0'}
                      </span>
                    </div>

                    {/* 6. Sil Butonu */}
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => handleRemoveRow(item.id)}
                        className="px-3.5 py-2.5 bg-red-650 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Trash2 size={13} />
                        Sil
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* === SAG SUTUN: FIS & ODEME PANELI (33% Genislik) === */}
          <div className="flex flex-col gap-6">
            
            {/* Canlı Milyem / Fiyat Ekranı (Widget) */}
            <div className={`${THEME.GLASS_CARD} p-4 flex flex-col gap-3.5 border border-yellow-900/15`}>
              <div className="flex justify-between items-center pb-2 border-b border-gray-800/40">
                <span className="text-xs font-bold text-yellow-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Coins className="text-yellow-500" size={14} />
                  CANLI FİYATLAR
                </span>
                <span className="text-[9px] text-gray-500 font-medium">Saniyede bir güncellenir</span>
              </div>
              
              <div className="grid grid-cols-3 text-[10px] text-gray-500 font-bold uppercase tracking-wider border-b border-gray-850 pb-1.5">
                <span>ÜRÜN</span>
                <span className="text-right">ALIŞ</span>
                <span className="text-right">SATIŞ</span>
              </div>
              
              <div className="flex flex-col gap-1.5 font-mono text-[10px]">
                {[
                  { label: 'Has Altın', id: 'mil24Ayar', type: 'sarrafiye' as const },
                  { label: 'Çeyrek Altın', id: 'ECEYREKTL', type: 'sarrafiye' as const },
                  { label: 'Yarım Altın', id: 'EYARIMTL', type: 'sarrafiye' as const },
                  { label: 'Tam Altın', id: 'ETAMTL', type: 'sarrafiye' as const },
                  { label: 'Ata Altın', id: 'EATATL', type: 'sarrafiye' as const },
                  { label: 'Gremse Altın', id: 'EGREMSETL', type: 'sarrafiye' as const },
                  { label: '22 Ayar Gram', id: 'mil22Ayar', type: 'sarrafiye' as const },
                  { label: 'Adana Burma', id: 'milAdanaBurma', type: 'sarrafiye' as const },
                  { label: 'Ajda Bilezik', id: 'milAjda', type: 'sarrafiye' as const },
                  { label: '14 Ayar Gram', id: 'mil14Ayar', type: 'sarrafiye' as const },
                  { label: 'USD/TRY', id: 'USDTRY', type: 'döviz' as const },
                  { label: 'EUR/TRY', id: 'EURTRY', type: 'döviz' as const },
                ].map((p) => {
                  const price = livePrices[p.id];
                  return (
                    <div key={p.id} className="grid grid-cols-3 text-gray-300">
                      <span className="text-gray-450 font-sans font-bold text-[10px]">{p.label}</span>
                      <span className="text-right font-extrabold text-emerald-400">
                        {price ? formatValue(price.bid, p.type) : '—'}
                      </span>
                      <span className="text-right font-extrabold text-white">
                        {price ? formatValue(price.ask, p.type) : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`${THEME.GLASS_CARD} p-5 flex flex-col gap-4 border border-yellow-900/15`}>
              {/* Ödeme Türü Butonları */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === 'cash'
                      ? 'bg-amber-500 border-amber-600 text-black'
                      : 'bg-gray-950/40 border-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Coins size={15} />
                  Nakit
                </button>
                <button
                  onClick={() => setPaymentMethod('bank')}
                  className={`py-2 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === 'bank'
                      ? 'bg-blue-600 border-blue-700 text-white'
                      : 'bg-gray-950/40 border-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Building size={15} />
                  Banka
                </button>
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`py-2 rounded-xl text-[10px] font-bold border flex flex-col items-center gap-1 transition-all ${
                    paymentMethod === 'card'
                      ? 'bg-purple-600 border-purple-700 text-white'
                      : 'bg-gray-950/40 border-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <CreditCard size={15} />
                  <div className="flex items-center gap-0.5">
                    <span>K.K.</span>
                    <input
                      type="number"
                      value={cardFeePercent}
                      onClick={e => e.stopPropagation()}
                      onChange={e => setCardFeePercent(e.target.value)}
                      className="w-8 py-0.5 bg-black/40 border border-purple-400/30 rounded text-center text-[10px] text-white font-mono"
                    />
                    <span>%</span>
                  </div>
                </button>
              </div>

              {/* Sipariş Notu */}
              <div>
                <input
                  type="text"
                  placeholder="Örn: Ahmet Yılmaz, sipariş notu..."
                  value={orderNote}
                  onChange={e => setOrderNote(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-950/60 border border-gray-800 rounded-xl text-white text-xs focus:outline-none focus:border-yellow-500/50"
                />
              </div>

              {/* BÜYÜK ALINACAK/ÖDENECEK TUTAR KARTI */}
              <div className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center ${
                netTotal >= 0
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-bold opacity-80 mb-1">
                  <Coins size={14} />
                  {netTotal >= 0 ? 'ALINACAK TUTAR' : 'ÖDENECEK TUTAR'}
                </span>
                <span className="text-2xl font-black font-mono">
                  ₺{basketTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Toplam Detaylar (Alış/Satış kırılımı ve Has Çarpanı) */}
              <div className="p-3 bg-gray-950/50 rounded-xl border border-gray-800/80 flex flex-col gap-1.5 text-xs text-gray-400 font-semibold">
                <div className="flex justify-between">
                  <span>Toplam Satış</span>
                  <span className="font-mono text-white">
                    ₺{totalSales.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-800/30 pt-1.5">
                  <span>Toplam Alış</span>
                  <span className="font-mono text-white">
                    ₺{totalPurchases.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                {(() => {
                  const totalHas = basket.reduce((sum, item) => {
                    if (item.barcodeDetail && item.barcodeDetail.costMilyem != null) {
                      const costMil = item.barcodeDetail.costMilyem || 0;
                      const laborMil = item.barcodeDetail.laborMilyem || 0;
                      const sellMil = item.barcodeDetail.sellingMilyem != null && item.barcodeDetail.sellingMilyem > 0
                        ? item.barcodeDetail.sellingMilyem
                        : (costMil + laborMil);
                      return sum + (sellMil * item.barcodeDetail.weight * item.quantity);
                    }
                    return sum;
                  }, 0);
                  if (totalHas === 0) return null;
                  return (
                    <div className="flex justify-between border-t border-yellow-900/30 pt-1.5 text-yellow-400 font-bold">
                      <span>Toplam Has Karşılığı</span>
                      <span className="font-mono">{totalHas.toFixed(3)} gr Has</span>
                    </div>
                  );
                })()}
              </div>

              {/* İşlemi Onayla ve Yazdır Düğmeleri */}
              <div className="flex flex-col gap-2 mt-1">
                {/* 1. Fiş Yazdır (Purple) */}
                <button
                  onClick={handlePrintReceipt}
                  disabled={submitting || basket.length === 0}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(147,51,234,0.2)]"
                >
                  <Printer size={16} />
                  Fiş Yazdır
                </button>

                {/* 2. WhatsApp Fiş Gönder (Emerald) */}
                <button
                  onClick={() => handleSendWhatsAppReceipt()}
                  disabled={basket.length === 0}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                >
                  <Send size={16} />
                  {MESSAGES.WA_SEND_RECEIPT}
                </button>

                {/* 3. Bilgi Fişi (Turquoise) */}
                <button
                  onClick={handlePrintInfo}
                  disabled={basket.length === 0}
                  className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FileText size={16} />
                  Bilgi Fişi
                </button>
              </div>

            </div>
          </div>
        </div>

      </div>
      )}

      {/* ─── GEÇMİŞ İŞLEMLER, KÂR/ZARAR & DÜZENLEME ALANI ─── */}
      {activeMainTab === 'history' && (
        <div className="p-6 flex flex-col gap-6 w-full max-w-[1920px] mx-auto">
          {/* Kâr / Zarar & Hasılat Özet Kartları */}
          {(() => {
            let totalSalesRevenue = 0;
            let totalProfit = 0;
            let profitableCount = 0;
            let sellCount = 0;

            transactions.forEach(tx => {
              if (tx.type === 'sell') {
                sellCount++;
                totalSalesRevenue += tx.total;
                if (tx.profitAmount != null) {
                  totalProfit += tx.profitAmount;
                  if (tx.profitAmount >= 0) profitableCount++;
                }
              }
            });

            const profitMargin = totalSalesRevenue > 0 ? (totalProfit / (totalSalesRevenue - totalProfit)) * 100 : 0;

            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`${THEME.GLASS_CARD} p-4 border border-yellow-500/20`}>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Toplam Satış Hasılatı</p>
                  <p className="text-xl font-black text-white font-mono mt-1">₺{Math.round(totalSalesRevenue).toLocaleString('tr-TR')}</p>
                  <span className="text-[10px] text-gray-500">{sellCount} Satış İşlemi</span>
                </div>
                <div className={`${THEME.GLASS_CARD} p-4 border border-emerald-500/20`}>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Net Kâr / Zarar</p>
                  <p className={`text-xl font-black font-mono mt-1 ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {totalProfit >= 0 ? `+₺${Math.round(totalProfit).toLocaleString('tr-TR')}` : `-₺${Math.round(Math.abs(totalProfit)).toLocaleString('tr-TR')}`}
                  </p>
                  <span className="text-[10px] text-emerald-500/80">{profitableCount} Kârlı İşlem</span>
                </div>
                <div className={`${THEME.GLASS_CARD} p-4 border border-blue-500/20`}>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ortalama Kâr Marjı</p>
                  <p className="text-xl font-black text-blue-400 font-mono mt-1">%{profitMargin.toFixed(1)}</p>
                  <span className="text-[10px] text-gray-500">Maliyet üstü marj</span>
                </div>
                <div className={`${THEME.GLASS_CARD} p-4 border border-purple-500/20`}>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Toplam İşlem Adedi</p>
                  <p className="text-xl font-black text-purple-300 font-mono mt-1">{transactions.length}</p>
                  <span className="text-[10px] text-gray-500">Kayıtlı Alış / Satış</span>
                </div>
              </div>
            );
          })()}

          {/* İşlem Listesi Tablosu */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${THEME.GLASS_CARD} overflow-hidden`}
          >
            {/* Tablo Başlık & Arama Çubuğu */}
            <div className="p-5 border-b border-gray-800/60 bg-gray-950/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <ArrowLeftRight size={20} className="text-yellow-500" />
                <div>
                  <h3 className="text-base font-bold text-white">İşlem Geçmişi, Kâr/Zarar ve Düzenleme</h3>
                  <p className="text-xs text-gray-400">Tüm alış, satış, revizyon ve şüpheli işlemler kaydı</p>
                </div>
              </div>

              {/* Arama Kutusu */}
              <div className="relative min-w-[260px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="text"
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  placeholder="Ürün, personel, fiş no veya tutar ara..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition-colors font-mono"
                />
              </div>
            </div>

            {/* Filtreleme Butonları */}
            <div className="px-5 py-3 border-b border-gray-800/40 bg-gray-900/30 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    historyTypeFilter === 'ALL'
                      ? 'bg-yellow-500 text-black shadow'
                      : 'bg-gray-800/80 text-gray-400 hover:text-white'
                  }`}
                >
                  Tümü ({transactions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter('SELL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    historyTypeFilter === 'SELL'
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-gray-800/80 text-gray-400 hover:text-white'
                  }`}
                >
                  Satışlar ({transactions.filter(t => t.type === 'sell').length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter('BUY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    historyTypeFilter === 'BUY'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-gray-800/80 text-gray-400 hover:text-white'
                  }`}
                >
                  Alışlar ({transactions.filter(t => t.type === 'buy').length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTypeFilter('SUSPICIOUS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    historyTypeFilter === 'SUSPICIOUS'
                      ? 'bg-rose-600 text-white shadow'
                      : 'bg-gray-800/80 text-gray-400 hover:text-white'
                  }`}
                >
                  Şüpheli ({transactions.filter(t => t.isSuspicious).length})
                </button>
              </div>

              <span className="text-xs text-gray-400 font-mono">
                {(() => {
                  const count = transactions.filter(tx => {
                    if (historyTypeFilter === 'SELL' && tx.type !== 'sell') return false;
                    if (historyTypeFilter === 'BUY' && tx.type !== 'buy') return false;
                    if (historyTypeFilter === 'SUSPICIOUS' && !tx.isSuspicious) return false;
                    if (historySearch.trim()) {
                      const q = historySearch.toLowerCase();
                      const matchesCode = tx.productCode.toLowerCase().includes(q);
                      const matchesEmp = (tx.employeeName || '').toLowerCase().includes(q);
                      const matchesMethod = (tx.paymentMethod || '').toLowerCase().includes(q);
                      const matchesTotal = String(tx.total).includes(q);
                      const matchesId = tx.id.toLowerCase().includes(q);
                      if (!matchesCode && !matchesEmp && !matchesMethod && !matchesTotal && !matchesId) return false;
                    }
                    return true;
                  }).length;
                  return `${count} işlem listeleniyor`;
                })()}
              </span>
            </div>

            <div className={THEME.TABLE.WRAPPER}>
              <table className={THEME.TABLE.MAIN}>
                <thead className={THEME.TABLE.THEAD}>
                  <tr>
                    <th className={THEME.TABLE.TH}>Tarih & Saat</th>
                    <th className={THEME.TABLE.TH}>Tür</th>
                    <th className={THEME.TABLE.TH}>Ürün & Miktar</th>
                    <th className={THEME.TABLE.TH}>Birim Fiyat</th>
                    <th className={THEME.TABLE.TH}>Toplam Tutar</th>
                    <th className={THEME.TABLE.TH}>Kâr / Zarar & Marj</th>
                    <th className={THEME.TABLE.TH}>Ödeme / Personel</th>
                    <th className={THEME.TABLE.TH}>İşlemler</th>
                  </tr>
                </thead>
                <tbody className={THEME.TABLE.TBODY}>
                  {(() => {
                    const filtered = transactions.filter(tx => {
                      if (historyTypeFilter === 'SELL' && tx.type !== 'sell') return false;
                      if (historyTypeFilter === 'BUY' && tx.type !== 'buy') return false;
                      if (historyTypeFilter === 'SUSPICIOUS' && !tx.isSuspicious) return false;
                      if (historySearch.trim()) {
                        const q = historySearch.toLowerCase();
                        const matchesCode = tx.productCode.toLowerCase().includes(q);
                        const matchesEmp = (tx.employeeName || '').toLowerCase().includes(q);
                        const matchesMethod = (tx.paymentMethod || '').toLowerCase().includes(q);
                        const matchesTotal = String(tx.total).includes(q);
                        const matchesId = tx.id.toLowerCase().includes(q);
                        if (!matchesCode && !matchesEmp && !matchesMethod && !matchesTotal && !matchesId) return false;
                      }
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-gray-500 text-sm">
                            {historySearch ? 'Arama kriterlerine uygun işlem bulunamadı.' : 'Henüz kayıtlı işlem geçmişi bulunamadı.'}
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map((tx, i) => (
                      <motion.tr
                        key={tx.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.01 }}
                        className={THEME.TABLE.TR}
                      >
                        <td className={THEME.TABLE.TD}>
                          <div className="text-xs font-mono text-gray-400">
                            {new Date(tx.createdAt).toLocaleString('tr-TR')}
                          </div>
                        </td>
                        <td className={THEME.TABLE.TD}>
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                              tx.type === 'buy'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}>
                              {tx.type === 'buy' ? 'ALIŞ' : 'SATIŞ'}
                            </span>
                            {tx.isSuspicious && (
                              <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-[10px] font-black uppercase">
                                Şüpheli
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={THEME.TABLE.TD}>
                          <div>
                            <span className="text-xs font-bold text-white block font-mono">{tx.productCode}</span>
                            <span className="text-[11px] text-yellow-500/80 font-mono font-semibold">
                              {tx.quantity} {tx.productType === 'döviz' ? '' : 'Adet'}
                            </span>
                          </div>
                        </td>
                        <td className={THEME.TABLE.TD}>
                          <span className="text-xs font-mono text-gray-300">
                            ₺{tx.price.toLocaleString('tr-TR')}
                          </span>
                        </td>
                        <td className={THEME.TABLE.TD}>
                          <span className="text-sm font-bold text-white font-mono">
                            ₺{tx.total.toLocaleString('tr-TR')}
                          </span>
                        </td>
                        <td className={THEME.TABLE.TD}>
                          {tx.profitAmount != null ? (
                            <div>
                              <span className={`text-xs font-bold font-mono ${tx.profitAmount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {tx.profitAmount >= 0 ? `+₺${tx.profitAmount.toLocaleString('tr-TR')}` : `-₺${Math.abs(tx.profitAmount).toLocaleString('tr-TR')}`}
                              </span>
                              {tx.profitMargin != null && (
                                <span className="text-[10px] text-gray-500 block font-mono">
                                  Marj: %{tx.profitMargin.toFixed(1)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500 text-xs font-mono">—</span>
                          )}
                        </td>
                        <td className={THEME.TABLE.TD}>
                          <div>
                            <span className="text-xs font-semibold text-gray-200 block">{tx.paymentMethod || 'Nakit'}</span>
                            <span className="text-[10px] text-gray-500">{tx.employeeName || 'Kasiyer'}</span>
                          </div>
                        </td>
                        <td className={THEME.TABLE.TD}>
                          <div className="flex items-center gap-1.5">
                            {/* Fiş Yazdır Butonu */}
                            <button
                              type="button"
                              onClick={() => handlePrintHistoricalTxReceipt(tx)}
                              className="p-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-semibold transition-all"
                              title="İşlem Fişini Termal Yazdır"
                            >
                              <Printer size={14} />
                            </button>
                            {/* Düzenle Butonu */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(tx)}
                              className="p-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg text-xs font-semibold transition-all"
                              title="İşlemi Düzenle"
                            >
                              <FileText size={14} />
                            </button>
                            {/* İptal / Sil Butonu */}
                            <button
                              type="button"
                              onClick={() => handleOpenDeleteModal(tx)}
                              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-semibold transition-all"
                              title="İşlemi İptal Et / Sil"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}

      {/* ─── İŞLEM DÜZENLEME MODALI ─── */}
      <AnimatePresence>
        {editTxModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-yellow-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FileText className="text-yellow-400" size={18} />
                    İşlem Bilgilerini Düzenle
                  </h3>
                  <p className="text-xs text-yellow-500/80 font-mono mt-0.5">
                    İşlem No: #{editTxModal.id.slice(-8)} ({editTxModal.productCode})
                  </p>
                </div>
                <button onClick={() => setEditTxModal(null)} className="text-gray-400 hover:text-white p-1">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEditTx} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Miktar</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editTxForm.quantity}
                      onChange={e => setEditTxForm({ ...editTxForm, quantity: e.target.value })}
                      className={THEME.INPUT}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Birim Fiyat (₺)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editTxForm.price}
                      onChange={e => setEditTxForm({ ...editTxForm, price: e.target.value })}
                      className={THEME.INPUT}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Ödeme Yöntemi</label>
                  <select
                    value={editTxForm.paymentMethod}
                    onChange={e => setEditTxForm({ ...editTxForm, paymentMethod: e.target.value })}
                    className={THEME.SELECT}
                  >
                    <option value="CASH">Nakit</option>
                    <option value="CARD">Kredi Kartı</option>
                    <option value="BANK">Banka / Havale</option>
                    <option value="DEBT">Veresiye / Açık Hesap</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-yellow-400 mb-1">
                    Düzenleme Gerekçesi (Zorunlu) *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={editTxForm.reason}
                    onChange={e => setEditTxForm({ ...editTxForm, reason: e.target.value })}
                    placeholder="Örn: Yanlış adet girilmişti, müşteri talebiyle düzeltildi..."
                    className={THEME.INPUT}
                  />
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    Bu açıklama İşlem Revizyon Denetim Günlüğüne kaydedilecektir.
                  </span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditTxModal(null)}
                    className="flex-1 py-2.5 bg-gray-800 text-gray-300 font-bold text-xs rounded-xl hover:bg-gray-700"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-yellow-500/20 disabled:opacity-50"
                  >
                    {actionLoading ? 'Güncelleniyor...' : 'Düzeltmeyi Kaydet'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── İŞLEM SİLME / İPTAL MODALI ─── */}
      <AnimatePresence>
        {deleteTxModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-red-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2 text-red-400 font-bold text-base">
                  <Trash2 size={18} />
                  İşlemi İptal Et / Sil
                </div>
                <button onClick={() => setDeleteTxModal(null)} className="text-gray-400 hover:text-white p-1">
                  <X size={18} />
                </button>
              </div>

              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-1 text-xs">
                <p className="text-white font-bold">
                  {deleteTxModal.type === 'buy' ? 'Alış İşlemi İptal Edilecek' : 'Satış İşlemi İptal Edilecek'}
                </p>
                <p className="text-gray-300 font-mono">
                  {deleteTxModal.quantity} Adet {deleteTxModal.productCode} — ₺{deleteTxModal.total.toLocaleString('tr-TR')}
                </p>
                <p className="text-yellow-400 text-[11px] pt-1">
                  ⚠️ Bu işlem iptal edildiğinde stok miktarı otomatik olarak eski haline geri iade edilecektir.
                </p>
              </div>

              <form onSubmit={handleConfirmDeleteTx} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-red-400 mb-1">
                    İptal / Silme Gerekçesi (Zorunlu) *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={deleteReason}
                    onChange={e => setDeleteReason(e.target.value)}
                    placeholder="Örn: Müşteri vazgeçti, hatalı kayıt girildi..."
                    className={THEME.INPUT}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteTxModal(null)}
                    className="flex-1 py-2.5 bg-gray-800 text-gray-300 font-bold text-xs rounded-xl hover:bg-gray-700"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/20 disabled:opacity-50"
                  >
                    {actionLoading ? 'İptal Ediliyor...' : 'İptali Onayla ve Stoğu İade Et'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── ÜRÜN SEÇİM MODALI ─────────────────────────────────────────── */}
      <AnimatePresence>
        {isProductModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className={`${THEME.GLASS_CARD} w-full max-w-lg p-6 mx-4 flex flex-col max-h-[85vh]`}
            >
              {/* Modal Başlık */}
              <div className="flex justify-between items-center pb-4 border-b border-gray-800/40">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <ArrowLeftRight size={18} className="text-yellow-500" />
                  Ürün Seçimi
                </h3>
                <button
                  onClick={() => setIsProductModalOpen(false)}
                  className="p-1 hover:bg-gray-850 hover:text-white text-gray-400 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Arama Girişi */}
              <div className="relative mt-4 mb-4">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  type="text"
                  placeholder="Ürün adı veya kod ara..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-900/60 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30 transition-all font-semibold"
                />
              </div>

              {/* Ürün Listesi */}
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4">
                {/* 1. Sarrafiye Grubu */}
                {filteredProducts.filter(p => p.type === 'sarrafiye').length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Sarrafiye Altın</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {filteredProducts.filter(p => p.type === 'sarrafiye').map(p => (
                        <button
                          key={p.code}
                          onClick={() => handleSelectProductFromModal(p.code)}
                          className="flex items-center justify-between p-3 rounded-xl border text-left transition-all bg-gray-900/40 border-gray-800/80 text-gray-300 hover:border-gray-700 hover:bg-gray-800/40"
                        >
                          <span className="font-semibold text-xs truncate mr-1">{p.label}</span>
                          <ChevronRight size={14} className="text-gray-500 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Döviz Grubu */}
                {filteredProducts.filter(p => p.type === 'döviz').length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Döviz</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {filteredProducts.filter(p => p.type === 'döviz').map(p => (
                        <button
                          key={p.code}
                          onClick={() => handleSelectProductFromModal(p.code)}
                          className="flex items-center justify-between p-3 rounded-xl border text-left transition-all bg-gray-900/40 border-gray-800/80 text-gray-300 hover:border-gray-700 hover:bg-gray-800/40"
                        >
                          <span className="font-semibold text-xs truncate mr-1">{p.label}</span>
                          <ChevronRight size={14} className="text-gray-500 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {filteredProducts.length === 0 && (
                  <div className="text-center py-6 text-gray-500 text-xs font-semibold">
                    Arama kriterine uygun ürün bulunamadı.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── NUMARATÖR (NUMPAD) MODALI ─────────────────────────────────────── */}
      <AnimatePresence>
        {numpad && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-4 text-white"
            >
              {/* Modal Başlık */}
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {numpad.title}
              </div>

              {/* Ekran (Display) */}
              <div className="flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-slate-850 font-mono text-2xl font-black">
                <span className="text-emerald-400 max-w-[220px] truncate text-3xl">
                  {formatNumpadDisplay(numpad.value, numpad.targetType, numpad.rowId)}
                </span>
                <button
                  onClick={handleNumpadBackspace}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  title="Geri Sil"
                >
                  <Delete size={20} />
                </button>
              </div>

              {/* Tuş Takımı (Numpad Grid) */}
              <div className="grid grid-cols-3 gap-2 text-xl font-bold font-mono">
                {['7', '8', '9', '4', '5', '6', '1', '2', '3', ',', '0', '00'].map(key => (
                  <button
                    key={key}
                    onClick={() => handleNumpadKeyPress(key)}
                    className="py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl transition-colors active:scale-95 duration-100"
                  >
                    {key}
                  </button>
                ))}
              </div>

              {/* İşlem Butonları (Temizle ve Tamam) */}
              <div className="grid grid-cols-2 gap-3 text-sm font-bold">
                <button
                  onClick={() => setNumpad(prev => prev ? { ...prev, value: '' } : null)}
                  className="py-3.5 border border-amber-500/50 hover:border-amber-400 text-amber-500 hover:text-amber-400 rounded-2xl transition-colors flex items-center justify-center gap-1.5"
                >
                  Temizle
                </button>
                <button
                  onClick={handleNumpadSubmit}
                  className="py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl transition-colors flex items-center justify-center gap-1.5"
                >
                  ✓ Tamam
                </button>
              </div>

              {/* Yuvarlama Seçenekleri (Sadece fiyat hedeflendiğinde çıkar) */}
              {numpad.targetType === 'row-price' && (
                <div className="grid grid-cols-2 gap-3 border-t border-slate-800/80 pt-4 mt-1">
                  <button
                    onClick={() => handleNumpadRound('down')}
                    className="py-3 border border-blue-500/40 hover:border-blue-400 text-blue-400 hover:text-blue-300 rounded-2xl text-xs font-bold transition-all"
                  >
                    ↓ Aşağı Yuvarla
                  </button>
                  <button
                    onClick={() => handleNumpadRound('up')}
                    className="py-3 border border-blue-500/40 hover:border-blue-400 text-blue-400 hover:text-blue-300 rounded-2xl text-xs font-bold transition-all"
                  >
                    ↑ Yukarı Yuvarla
                  </button>
                </div>
              )}

              {/* Kapat / İptal butonu */}
              <button
                onClick={() => setNumpad(null)}
                className="w-full py-2 bg-slate-950/40 hover:bg-slate-950/80 text-xs text-slate-500 hover:text-slate-300 rounded-xl transition-colors"
              >
                Vazgeç
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* KAMERA BARKOD OKUYUCU MODAL */}
      <CameraScannerModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onScan={(scannedBarcode) => {
          handleBarcodeSearch(scannedBarcode);
        }}
      />

      {/* TERMAL FİŞ & BİLGİ FİŞİ YAZDIRMA MODALI */}
      <POSTransactionReceiptModal
        isOpen={Boolean(receiptModalData)}
        onClose={() => setReceiptModalData(null)}
        receiptData={receiptModalData}
        onConfirmAndSave={activeMainTab === 'pos' && basket.some(b => b.productCode !== '') ? async () => {
          await handleSaveTransactions();
          setReceiptModalData(null);
        } : undefined}
      />
    </>
  );
}
