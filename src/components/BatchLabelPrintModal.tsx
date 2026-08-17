'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Printer,
  X,
  Copy,
  Check,
  Download,
  FileCode,
  Sliders,
  Layers,
  Trash2,
  Eye,
  Package,
  Coins,
  Sparkles,
  Info,
  CheckSquare,
} from 'lucide-react';
import {
  LABEL_TEMPLATES,
  LABEL_TEMPLATE_LABELS,
  LABEL_DIMENSIONS,
  LABEL_DPI,
  LabelTemplate,
  LabelDpi,
} from '@/constants/labels';
import { THEME, ANIM } from '@/constants/theme';
import {
  LabelProductData,
  generateKelebekLabelSVG,
  generateLabelPrintHTML,
  LABEL_FONT_CONFIG,
} from '@/lib/labels/kelebek';
import { generateBatchZPL } from '@/lib/labels/zpl';

export interface BatchItemEntry {
  id: string;
  barcode: string;
  title: string;
  carat: number | string;
  weight: number;
  costMilyem?: number | null;
  laborMilyem?: number | null;
  sellingMilyem?: number | null;
  profitMargin?: number | null;
  category?: string | null;
  subType?: string | null;
  size?: string | null;
  copies: number;
}

export interface BatchLabelPrintModalProps {
  items: Array<{
    id: string;
    barcode: string;
    title: string;
    carat: number | string;
    weight: number;
    costMilyem?: number | null;
    laborMilyem?: number | null;
    sellingMilyem?: number | null;
    profitMargin?: number | null;
    category?: string | null;
    subType?: string | null;
    size?: string | null;
    quantity?: number | null;
  }>;
  isOpen: boolean;
  onClose: () => void;
  hasPrice?: { bid: number; ask: number } | null;
  onClearSelection?: () => void;
  defaultStoreName?: string;
}

export default function BatchLabelPrintModal({
  items,
  isOpen,
  onClose,
  hasPrice,
  onClearSelection,
  defaultStoreName = LABEL_FONT_CONFIG.DEFAULT_STORE_NAME,
}: BatchLabelPrintModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<LabelTemplate>(LABEL_TEMPLATES.BUTTERFLY_74x12);
  const [selectedDpi, setSelectedDpi] = useState<LabelDpi>(LABEL_DPI.DPI_203);
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showMilyem, setShowMilyem] = useState<boolean>(true);
  const [storeName, setStoreName] = useState<string>(defaultStoreName);
  const [activeTab, setActiveTab] = useState<'preview' | 'zpl'>('preview');
  const [copied, setCopied] = useState<boolean>(false);

  // Yerel kopya sayılarını tutan durum
  const [batchList, setBatchList] = useState<BatchItemEntry[]>([]);

  // items prop değiştikçe batchList'i senkronize et
  React.useEffect(() => {
    if (items) {
      setBatchList(
        items.map(item => ({
          id: item.id,
          barcode: item.barcode,
          title: item.title || [item.category, item.subType].filter(Boolean).join(' ') || 'Altın Takı',
          carat: item.carat,
          weight: item.weight,
          costMilyem: item.costMilyem,
          laborMilyem: item.laborMilyem,
          sellingMilyem: item.sellingMilyem,
          profitMargin: item.profitMargin,
          category: item.category,
          subType: item.subType,
          size: item.size,
          copies: Math.max(1, item.quantity || 1),
        }))
      );
    }
  }, [items]);

  // Kopya adedini güncelle
  const handleUpdateCopies = (id: string, newCopies: number) => {
    setBatchList(prev =>
      prev.map(item => (item.id === id ? { ...item, copies: Math.max(1, newCopies) } : item))
    );
  };

  // Ürünü listeden çıkar
  const handleRemoveItem = (id: string) => {
    setBatchList(prev => prev.filter(item => item.id !== id));
  };

  // Toplam İstatistikler
  const totalItemsCount = batchList.length;
  const totalLabelsCount = batchList.reduce((acc, item) => acc + item.copies, 0);
  const totalWeight = batchList.reduce((acc, item) => acc + item.weight * item.copies, 0);

  // LabelProductData listesine dönüştür
  const formattedLabelDataList: LabelProductData[] = useMemo(() => {
    return batchList.map(item => {
      const totalCostMil = (item.costMilyem || 0) + (item.laborMilyem || 0);
      const sellingMil = item.sellingMilyem != null && item.sellingMilyem > 0
        ? item.sellingMilyem
        : ((item.profitMargin || 0) > 0 ? totalCostMil * (1 + (item.profitMargin || 0) / 100) : totalCostMil);
      const sellingHas = sellingMil * (item.weight || 0);
      const priceTL = Math.round((hasPrice?.ask || 0) * sellingHas);

      return {
        id: item.id,
        barcode: item.barcode,
        title: item.title,
        carat: item.carat,
        weight: item.weight,
        priceTL: priceTL > 0 ? priceTL : undefined,
        sellingMilyem: item.sellingMilyem || undefined,
        costMilyem: item.costMilyem || undefined,
        category: item.category,
        subType: item.subType,
        size: item.size,
        storeName: storeName,
        quantity: item.copies,
      };
    });
  }, [batchList, hasPrice, storeName]);

  // ZPL Batch Stream
  const batchZplCode = useMemo(() => {
    if (formattedLabelDataList.length === 0) return '';
    return generateBatchZPL(formattedLabelDataList, selectedDpi, selectedTemplate, {
      storeName,
      showPrice,
      showMilyem,
    });
  }, [formattedLabelDataList, selectedDpi, selectedTemplate, storeName, showPrice, showMilyem]);

  if (!isOpen) return null;

  const currentDim = LABEL_DIMENSIONS[selectedTemplate];

  // Toplu Tarayıcı Doğrudan Baskısı
  const handleBatchBrowserPrint = () => {
    if (formattedLabelDataList.length === 0) return;

    const htmlContent = generateLabelPrintHTML(formattedLabelDataList, {
      template: selectedTemplate,
      storeName,
      showPrice,
      showMilyem,
    });

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1000);
      }, 350);
    }
  };

  // ZPL Kopyalama
  const handleCopyZPL = () => {
    navigator.clipboard.writeText(batchZplCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ZPL İndirme
  const handleDownloadZPL = () => {
    const blob = new Blob([batchZplCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `toplu_etiketler_${batchList.length}_adet_${selectedDpi}dpi.zpl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4 overflow-y-auto py-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]"
        >
          {/* Modal Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-800 bg-gray-950/70 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                <Printer className="text-yellow-400" size={20} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  Toplu Kelebek Etiket Yazdırma (Rulo / Seri Baskı)
                  <span className="text-xs font-bold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                    {totalLabelsCount} Etiket
                  </span>
                </h2>
                <p className="text-xs text-gray-400">
                  {totalItemsCount} Farklı Ürün • Toplam {totalWeight.toFixed(2)} gr Altın
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Modal İçerik (Scrollable) */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            
            {/* Üst İstatistik ve Yapılandırma Paneli */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              
              {/* Şablon Seçimi (5 col) */}
              <div className="md:col-span-5 bg-gray-950/50 border border-gray-800 rounded-xl p-3.5 space-y-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={13} className="text-yellow-400" /> Rulo Etiket Şablonu
                </label>
                <select
                  value={selectedTemplate}
                  onChange={e => setSelectedTemplate(e.target.value as LabelTemplate)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-xs font-semibold focus:outline-none focus:border-yellow-500"
                >
                  {Object.entries(LABEL_TEMPLATES).map(([key, value]) => (
                    <option key={key} value={value}>
                      {LABEL_TEMPLATE_LABELS[value]} ({LABEL_DIMENSIONS[value].totalWidthMm}x{LABEL_DIMENSIONS[value].heightMm}mm)
                    </option>
                  ))}
                </select>
              </div>

              {/* Baskı Parametreleri (7 col) */}
              <div className="md:col-span-7 bg-gray-950/50 border border-gray-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex-1 min-w-[140px]">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Mağaza Adı
                  </label>
                  <input
                    type="text"
                    maxLength={18}
                    value={storeName}
                    onChange={e => setStoreName(e.target.value)}
                    placeholder="Mağaza Başlığı"
                    className="w-full px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-300 select-none">
                    <input
                      type="checkbox"
                      checked={showPrice}
                      onChange={e => setShowPrice(e.target.checked)}
                      className="rounded bg-gray-800 border-gray-700 text-yellow-500 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    Fiyat (TL)
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-300 select-none">
                    <input
                      type="checkbox"
                      checked={showMilyem}
                      onChange={e => setShowMilyem(e.target.checked)}
                      className="rounded bg-gray-800 border-gray-700 text-yellow-500 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    Milyem
                  </label>
                </div>
              </div>

            </div>

            {/* Çıktı Modu Sekmeleri */}
            <div className="flex bg-gray-950 p-1 rounded-xl border border-gray-800 max-w-md">
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'preview' ? 'bg-yellow-500 text-black shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Eye size={13} /> Liste & Canlı Önizleme ({batchList.length})
              </button>
              <button
                onClick={() => setActiveTab('zpl')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'zpl' ? 'bg-yellow-500 text-black shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                <FileCode size={13} /> Toplu ZPL II Akışı
              </button>
            </div>

            {/* TAB 1: ÜRÜN LİSTESİ VE ÖNİZLEME */}
            {activeTab === 'preview' ? (
              <div className="space-y-4">
                {batchList.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 bg-gray-950/40 rounded-xl border border-gray-800">
                    Baskı listesinde ürün bulunmamaktadır.
                  </div>
                ) : (
                  <div className="border border-gray-800 rounded-xl overflow-hidden bg-gray-950/40">
                    <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-800/60">
                      {batchList.map((item, index) => {
                        const singleLabelData: LabelProductData = {
                          barcode: item.barcode,
                          title: item.title,
                          carat: item.carat,
                          weight: item.weight,
                          priceTL: (formattedLabelDataList[index]?.priceTL),
                          sellingMilyem: item.sellingMilyem || undefined,
                          storeName: storeName,
                          quantity: item.copies,
                        };
                        const svgPreview = generateKelebekLabelSVG(singleLabelData, selectedTemplate, {
                          storeName,
                          showPrice,
                          showMilyem,
                        });

                        return (
                          <div
                            key={item.id}
                            className="p-3.5 flex flex-col md:flex-row items-center justify-between gap-4 hover:bg-yellow-500/5 transition-colors"
                          >
                            {/* Sol Ürün Bilgisi */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-yellow-400">
                                  {item.barcode}
                                </span>
                                <span className="text-xs font-bold text-white truncate">
                                  {item.title}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                {item.carat} Ayar • {item.weight.toFixed(2)} gr
                                {item.sellingMilyem ? ` • Satış Milyemi: ${item.sellingMilyem}` : ''}
                              </p>
                            </div>

                            {/* Orta: Küçük Vektör Önizleme */}
                            <div className="bg-white p-1 rounded border border-gray-300 shadow-sm shrink-0 w-64 h-12 flex items-center justify-center overflow-hidden">
                              <div 
                                className="w-full select-none"
                                dangerouslySetInnerHTML={{ __html: svgPreview }} 
                              />
                            </div>

                            {/* Sağ: Kopya Sayacı ve Sil Butonu */}
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-750 px-2 py-1 rounded-lg">
                                <span className="text-[11px] text-gray-400">Adet:</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={99}
                                  value={item.copies}
                                  onChange={e => handleUpdateCopies(item.id, parseInt(e.target.value) || 1)}
                                  className="w-12 bg-transparent text-center text-xs font-mono font-bold text-white focus:outline-none"
                                />
                              </div>

                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                title="Listeden Çıkar"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* TAB 2: TOPLU ZPL II AKIŞI */
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-300">Yazıcı DPI:</span>
                    <div className="flex gap-1 bg-gray-900 p-0.5 rounded-lg border border-gray-800">
                      <button
                        onClick={() => setSelectedDpi(LABEL_DPI.DPI_203)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                          selectedDpi === LABEL_DPI.DPI_203 ? 'bg-yellow-500 text-black' : 'text-gray-400'
                        }`}
                      >
                        203 DPI
                      </button>
                      <button
                        onClick={() => setSelectedDpi(LABEL_DPI.DPI_300)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                          selectedDpi === LABEL_DPI.DPI_300 ? 'bg-yellow-500 text-black' : 'text-gray-400'
                        }`}
                      >
                        300 DPI
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyZPL}
                      className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      {copied ? 'Kopyalandı!' : 'Toplu ZPL Kopyala'}
                    </button>
                    <button
                      onClick={handleDownloadZPL}
                      className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <Download size={13} />
                      .zpl İndir
                    </button>
                  </div>
                </div>

                <pre className="max-h-[300px] bg-black/60 p-3 rounded-lg font-mono text-[11px] text-emerald-400 overflow-y-auto whitespace-pre border border-gray-850 select-all">
                  {batchZplCode}
                </pre>
              </div>
            )}

          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 border-t border-gray-800 bg-gray-950/70 flex items-center justify-between shrink-0">
            <div className="text-xs text-gray-400 flex items-center gap-2">
              <Info size={14} className="text-yellow-400" />
              <span>
                Toplam <strong>{totalLabelsCount} adet</strong> etiket rulo baskıya gönderilecek.
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white bg-gray-800/80 hover:bg-gray-800 transition-colors"
              >
                Vazgeç
              </button>
              <button
                onClick={handleBatchBrowserPrint}
                disabled={batchList.length === 0}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-black bg-yellow-500 hover:bg-yellow-400 transition-all flex items-center gap-2 shadow-lg shadow-yellow-500/20 disabled:opacity-50"
              >
                <Printer size={16} />
                Rulo Baskıyı Başlat ({totalLabelsCount} Adet)
              </button>
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
