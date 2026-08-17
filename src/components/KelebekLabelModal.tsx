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
  Sparkles,
  Layers,
  Store,
  Tag,
  Eye,
  Info,
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
import { generateKelebekZPL } from '@/lib/labels/zpl';

export interface KelebekLabelModalProps {
  item: {
    id?: string;
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
    subSubType?: string | null;
    size?: string | null;
    supplierName?: string | null;
    quantity?: number | null;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  hasPrice?: { bid: number; ask: number } | null;
  defaultStoreName?: string;
}

export default function KelebekLabelModal({
  item,
  isOpen,
  onClose,
  hasPrice,
  defaultStoreName = LABEL_FONT_CONFIG.DEFAULT_STORE_NAME,
}: KelebekLabelModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<LabelTemplate>(LABEL_TEMPLATES.BUTTERFLY_74x12);
  const [selectedDpi, setSelectedDpi] = useState<LabelDpi>(LABEL_DPI.DPI_203);
  const [printCopies, setPrintCopies] = useState<number>(1);
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showMilyem, setShowMilyem] = useState<boolean>(true);
  const [storeName, setStoreName] = useState<string>(defaultStoreName);
  const [activeTab, setActiveTab] = useState<'preview' | 'zpl'>('preview');
  const [copied, setCopied] = useState<boolean>(false);

  // Fiyat ve Has Çarpanı Hesabı
  const calculatedPriceTL = useMemo(() => {
    if (!item) return 0;
    const totalCostMil = (item.costMilyem || 0) + (item.laborMilyem || 0);
    const sellingMil = item.sellingMilyem != null && item.sellingMilyem > 0
      ? item.sellingMilyem
      : ((item.profitMargin || 0) > 0 ? totalCostMil * (1 + (item.profitMargin || 0) / 100) : totalCostMil);
    const sellingHas = sellingMil * (item.weight || 0);
    return Math.round((hasPrice?.ask || 0) * sellingHas);
  }, [item, hasPrice]);

  const labelData: LabelProductData | null = useMemo(() => {
    if (!item) return null;
    return {
      id: item.id,
      barcode: item.barcode,
      title: item.title || [item.category, item.subType].filter(Boolean).join(' ') || 'Altın Takı',
      carat: item.carat,
      weight: item.weight,
      priceTL: calculatedPriceTL > 0 ? calculatedPriceTL : undefined,
      sellingMilyem: item.sellingMilyem || undefined,
      costMilyem: item.costMilyem || undefined,
      category: item.category,
      subType: item.subType,
      size: item.size,
      storeName: storeName,
      quantity: printCopies,
    };
  }, [item, calculatedPriceTL, storeName, printCopies]);

  // Vektör SVG Çıktısı
  const svgMarkup = useMemo(() => {
    if (!labelData) return '';
    return generateKelebekLabelSVG(labelData, selectedTemplate, {
      storeName,
      showPrice,
      showMilyem,
    });
  }, [labelData, selectedTemplate, storeName, showPrice, showMilyem]);

  // ZPL II Çıktısı
  const zplCode = useMemo(() => {
    if (!labelData) return '';
    return generateKelebekZPL(labelData, selectedDpi, selectedTemplate, {
      storeName,
      showPrice,
      showMilyem,
    });
  }, [labelData, selectedDpi, selectedTemplate, storeName, showPrice, showMilyem]);

  if (!isOpen || !item || !labelData) return null;

  const currentDim = LABEL_DIMENSIONS[selectedTemplate];

  // Doğrudan Yazdırma Tetikleyici
  const handleBrowserPrint = () => {
    const htmlContent = generateLabelPrintHTML(labelData, {
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

  // ZPL Kodunu Panoya Kopyalama
  const handleCopyZPL = () => {
    navigator.clipboard.writeText(zplCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ZPL Dosyası İndirme (.prn/.zpl)
  const handleDownloadZPL = () => {
    const blob = new Blob([zplCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `etiket_${item.barcode}_${selectedDpi}dpi.zpl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md px-4 overflow-y-auto py-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto"
        >
          {/* Modal Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-800 bg-gray-950/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                <Printer className="text-yellow-400" size={20} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  Kuyumcu Kelebek Etiket Yazdır
                  <span className="text-xs font-mono font-bold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                    {item.barcode}
                  </span>
                </h2>
                <p className="text-xs text-gray-400">
                  {item.title} • {item.carat} Ayar • {item.weight.toFixed(2)} gr
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

          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Sol Sütun: Ayarlar ve Kontroller (5 Col) */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Şablon Seçici */}
              <div className="bg-gray-950/50 border border-gray-800/80 rounded-xl p-4 space-y-3">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-yellow-400" /> Etiket Şablonu
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(LABEL_TEMPLATES).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedTemplate(value)}
                      className={`px-3 py-2.5 rounded-lg text-left text-xs font-semibold flex items-center justify-between transition-all ${
                        selectedTemplate === value
                          ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 shadow-sm'
                          : 'bg-gray-900/60 text-gray-400 hover:text-gray-200 border border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <span>{LABEL_TEMPLATE_LABELS[value]}</span>
                      <span className="font-mono text-[10px] text-gray-500">
                        {LABEL_DIMENSIONS[value].totalWidthMm}x{LABEL_DIMENSIONS[value].heightMm}mm
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Baskı Seçenekleri */}
              <div className="bg-gray-950/50 border border-gray-800/80 rounded-xl p-4 space-y-3">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders size={14} className="text-yellow-400" /> Baskı Parametreleri
                </label>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-gray-400 block mb-1">Kopya Adedi</label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={printCopies}
                      onChange={e => setPrintCopies(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 block mb-1">Mağaza Başlığı</label>
                    <input
                      type="text"
                      maxLength={18}
                      value={storeName}
                      onChange={e => setStoreName(e.target.value)}
                      placeholder="Mağaza Adı"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-800/60 flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-300">
                    <input
                      type="checkbox"
                      checked={showPrice}
                      onChange={e => setShowPrice(e.target.checked)}
                      className="rounded bg-gray-800 border-gray-700 text-yellow-500 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    Fiyat Göster (TL)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-300">
                    <input
                      type="checkbox"
                      checked={showMilyem}
                      onChange={e => setShowMilyem(e.target.checked)}
                      className="rounded bg-gray-800 border-gray-700 text-yellow-500 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                    Milyem Kodu Göster
                  </label>
                </div>
              </div>

              {/* Çıktı Modu Sekmesi */}
              <div className="flex bg-gray-950 p-1 rounded-xl border border-gray-800">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'preview'
                      ? 'bg-yellow-500 text-black shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Eye size={14} /> Canlı Önizleme
                </button>
                <button
                  onClick={() => setActiveTab('zpl')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'zpl'
                      ? 'bg-yellow-500 text-black shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <FileCode size={14} /> ZPL II Kodu
                </button>
              </div>

            </div>

            {/* Sağ Sütun: Canlı Önizleme / ZPL Görünümü (7 Col) */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
              
              {activeTab === 'preview' ? (
                <div className="bg-gray-950/80 border border-gray-800 rounded-xl p-6 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
                  
                  {/* Milimetre Ölçek / Etiket Başlığı */}
                  <div className="w-full flex items-center justify-between text-xs text-gray-400 mb-4 pb-2 border-b border-gray-800/80">
                    <span className="font-semibold">{currentDim.name}</span>
                    <span className="font-mono text-yellow-400 font-bold">
                      {currentDim.totalWidthMm} mm × {currentDim.heightMm} mm (Standart)
                    </span>
                  </div>

                  {/* Gerçek Vektörel Etiket Önizleme Kartı */}
                  <div className="p-5 bg-white rounded-lg shadow-2xl border border-gray-300 flex items-center justify-center max-w-full overflow-x-auto">
                    <div 
                      className="w-full select-none"
                      style={{ maxWidth: `${Math.min(500, currentDim.totalWidthMm * 6.5)}px` }}
                      dangerouslySetInnerHTML={{ __html: svgMarkup }} 
                    />
                  </div>

                  {/* Kanat Bilgilendirme Notu */}
                  {currentDim.hasBridge && (
                    <div className="mt-4 text-[11px] text-gray-400 flex items-center gap-2 bg-gray-900/60 px-3 py-1.5 rounded-lg border border-gray-800">
                      <Info size={13} className="text-yellow-400 shrink-0" />
                      <span>
                        Sol Kanat: <strong>{currentDim.leftWingWidthMm}mm</strong> • 
                        Orta Köprü (İp Boşluğu): <strong>{currentDim.bridgeWidthMm}mm</strong> • 
                        Sağ Kanat: <strong>{currentDim.rightWingWidthMm}mm</strong>
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* ZPL II KODU GÖRÜNÜMÜ */
                <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 flex flex-col min-h-[300px]">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-300">ZPL II Yazıcı Çözünürlüğü:</span>
                      <div className="flex gap-1 bg-gray-900 p-0.5 rounded-lg border border-gray-800">
                        <button
                          onClick={() => setSelectedDpi(LABEL_DPI.DPI_203)}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono transition-colors ${
                            selectedDpi === LABEL_DPI.DPI_203 ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          203 DPI (8 dot/mm)
                        </button>
                        <button
                          onClick={() => setSelectedDpi(LABEL_DPI.DPI_300)}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono transition-colors ${
                            selectedDpi === LABEL_DPI.DPI_300 ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          300 DPI (12 dot/mm)
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyZPL}
                        className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                      >
                        {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        {copied ? 'Kopyalandı!' : 'Kopyala'}
                      </button>
                      <button
                        onClick={handleDownloadZPL}
                        className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                      >
                        <Download size={12} />
                        .zpl İndir
                      </button>
                    </div>
                  </div>

                  <pre className="flex-1 bg-black/60 p-3 rounded-lg font-mono text-[11px] text-emerald-400 overflow-x-auto whitespace-pre-wrap border border-gray-850 select-all leading-relaxed">
                    {zplCode}
                  </pre>
                  <p className="text-[10px] text-gray-500 mt-2">
                    * Bu ZPL komutlarını Zebra Designer, Argox Print Utility veya ağ termal yazıcınıza doğrudan RAW port (9100) üzerinden gönderebilirsiniz.
                  </p>
                </div>
              )}

              {/* Alt Eylem Butonları */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white bg-gray-800/80 hover:bg-gray-800 transition-colors"
                >
                  Kapat
                </button>
                <button
                  onClick={handleBrowserPrint}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-black bg-yellow-500 hover:bg-yellow-400 transition-all flex items-center gap-2 shadow-lg shadow-yellow-500/20"
                >
                  <Printer size={16} />
                  Etiketi Yazdır ({printCopies} Adet)
                </button>
              </div>

            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
