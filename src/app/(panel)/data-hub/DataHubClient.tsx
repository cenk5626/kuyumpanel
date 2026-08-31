'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileSpreadsheet,
  Download,
  Upload,
  Database,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  RefreshCw,
  Package,
  Users,
  Truck,
  Building,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { THEME } from '@/constants/theme';
import { MESSAGES } from '@/constants/messages';
import HeaderActions from '@/components/HeaderActions';
import * as XLSX from 'xlsx';

export default function DataHubClient() {
  const [importType, setImportType] = useState<'stocks' | 'customers' | 'full_backup'>('stocks');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Örnek Excel Şablonu İndirme (SheetJS ile tarayıcıda oluşturulur)
  const handleDownloadTemplate = (type: 'stocks' | 'customers') => {
    const wb = XLSX.utils.book_new();

    if (type === 'stocks') {
      const sampleData = [
        {
          'Barkod': '14KP0001',
          'Ürün Başlığı': '14 Ayar Taşlı Ajda Küpe',
          'Kategori': 'Küpe',
          'Alt Tür': 'Ajda',
          'Ayar': '14',
          'Ağırlık (gr)': 4.25,
          'Geliş Milyemi': 0.585,
          'İşçilik Milyemi': 0.120,
          'Kâr Marjı (%)': 12,
          'Toptancı': 'Altınbaş Atölye',
          'Pırlanta mı?': 'Hayır',
          'Pırlanta Karat': '',
          'Pırlanta Renk': '',
          'Pırlanta Berraklık': '',
          'Pırlanta Kesim': '',
          'Sertifika No': '',
        },
        {
          'Barkod': 'PIR0001',
          'Ürün Başlığı': '0.35 Karat Tektaş Pırlanta Yüzük',
          'Kategori': 'Yüzük',
          'Alt Tür': 'Tektaş',
          'Ayar': '18',
          'Ağırlık (gr)': 3.10,
          'Geliş Milyemi': 0.750,
          'İşçilik Milyemi': 0.200,
          'Kâr Marjı (%)': 25,
          'Toptancı': 'Zen Diamond',
          'Pırlanta mı?': 'Evet',
          'Pırlanta Karat': 0.35,
          'Pırlanta Renk': 'F',
          'Pırlanta Berraklık': 'VS1',
          'Pırlanta Kesim': 'Excellent',
          'Sertifika No': 'GIA-248190',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(sampleData);
      XLSX.utils.book_append_sheet(wb, ws, 'Ornek_Stoklar');
      XLSX.writeFile(wb, 'KuyumPanel_Ornek_Stok_Sablonu.xlsx');
    } else {
      const sampleData = [
        {
          'Müşteri Adı': 'Ahmet Yılmaz',
          'Telefon': '05321112233',
          'TC Kimlik No': '12345678901',
          'E-posta': 'ahmet@example.com',
          'Has Bakiye (gr)': 0,
          'TL Bakiye (₺)': 0,
          'Adres': 'Kapalıçarşı No:12 Fatih/İstanbul',
          'Not': 'VIP Müşteri',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(sampleData);
      XLSX.utils.book_append_sheet(wb, ws, 'Ornek_Musteriler');
      XLSX.writeFile(wb, 'KuyumPanel_Ornek_Musteri_Sablonu.xlsx');
    }
  };

  // Veri İçe Aktarma (Import)
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Lütfen bir dosya seçiniz.');
      return;
    }

    try {
      setUploading(true);
      setStatusMessage(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', importType);

      const res = await fetch('/api/backup/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ type: 'success', text: data.message || 'Veriler başarıyla yüklendi.' });
        setSelectedFile(null);
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Yükleme başarısız oldu.' });
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: 'Hata: ' + e.message });
    } finally {
      setUploading(false);
    }
  };

  // Dışa Aktarma (Export)
  const handleExport = (type: string, format = 'xlsx') => {
    window.location.href = `/api/backup/export?type=${type}&format=${format}`;
  };

  return (
    <>
      <header className={THEME.HEADER}>
        <div className="flex justify-between items-center w-full flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-2xl">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h1 className={THEME.HEADER_TITLE}>{MESSAGES.DATA_HUB_TITLE}</h1>
              <p className="text-gray-400 text-xs mt-0.5">{MESSAGES.DATA_HUB_SUBTITLE}</p>
            </div>
          </div>
          <HeaderActions />
        </div>
      </header>

      <div className={`${THEME.PAGE_WRAPPER} space-y-8`}>
        {/* ─── 1. TOPLU DIŞA AKTARMA (EXPORT HUB) ─── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Download size={18} className="text-yellow-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              1. Verileri Excel / CSV Olarak İndir (Export)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Stok Envanteri Export */}
            <div className={`${THEME.GLASS_CARD} p-5 space-y-3 hover:border-yellow-500/40 transition-all`}>
              <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-400 w-fit">
                <Package size={20} />
              </div>
              <h4 className="text-sm font-bold text-white">Stok Envanteri</h4>
              <p className="text-xs text-gray-400">
                Tüm barkodlu takılar, ayarlar, gramajlar, maliyetler ve pırlanta özellikleri.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleExport('stocks', 'xlsx')}
                  className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-yellow-500/10"
                >
                  <FileDown size={14} /> Excel (.xlsx)
                </button>
                <button
                  onClick={() => handleExport('stocks', 'csv')}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl transition-all"
                >
                  CSV
                </button>
              </div>
            </div>

            {/* Müşteri Rehberi Export */}
            <div className={`${THEME.GLASS_CARD} p-5 space-y-3 hover:border-yellow-500/40 transition-all`}>
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 w-fit">
                <Users size={20} />
              </div>
              <h4 className="text-sm font-bold text-white">Müşteri Rehberi</h4>
              <p className="text-xs text-gray-400">
                Müşteri iletişim bilgileri, Has ve TL borç/alacak bakiyeleri ve veresiye limitleri.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleExport('customers', 'xlsx')}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-purple-600/10"
                >
                  <FileDown size={14} /> Excel (.xlsx)
                </button>
                <button
                  onClick={() => handleExport('customers', 'csv')}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl transition-all"
                >
                  CSV
                </button>
              </div>
            </div>

            {/* Toptancı Hesapları Export */}
            <div className={`${THEME.GLASS_CARD} p-5 space-y-3 hover:border-yellow-500/40 transition-all`}>
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 w-fit">
                <Truck size={20} />
              </div>
              <h4 className="text-sm font-bold text-white">Toptancı / Atölye</h4>
              <p className="text-xs text-gray-400">
                Toptancı listesi, Has altın ve TL borç bakiyeleri, virman kayıtları.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleExport('suppliers', 'xlsx')}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/10"
                >
                  <FileDown size={14} /> Excel (.xlsx)
                </button>
                <button
                  onClick={() => handleExport('suppliers', 'csv')}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl transition-all"
                >
                  CSV
                </button>
              </div>
            </div>

            {/* Satış Hareketleri Export */}
            <div className={`${THEME.GLASS_CARD} p-5 space-y-3 hover:border-yellow-500/40 transition-all`}>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit">
                <Building size={20} />
              </div>
              <h4 className="text-sm font-bold text-white">İşlem & Kasa Geçmişi</h4>
              <p className="text-xs text-gray-400">
                Alış/satış geçmişi, kâr marjları, personel kayıtları ve ödeme yöntemleri.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleExport('transactions', 'xlsx')}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/10"
                >
                  <FileDown size={14} /> Excel (.xlsx)
                </button>
                <button
                  onClick={() => handleExport('transactions', 'csv')}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl transition-all"
                >
                  CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 2. TOPLU İÇE AKTARMA (IMPORT HUB) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sol Kolon (7 Col): Dosya Yükleme Formu */}
          <div className={`${THEME.GLASS_CARD} p-6 lg:col-span-7 space-y-5`}>
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Upload size={18} className="text-yellow-400" />
                2. Excel / CSV ile Toplu Veri Yükleme (Import)
              </h3>
            </div>

            {/* Yükleme Türü Seçici */}
            <div className="flex bg-gray-950 p-1 rounded-2xl border border-gray-800">
              <button
                type="button"
                onClick={() => setImportType('stocks')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                  importType === 'stocks'
                    ? 'bg-yellow-500 text-gray-950 shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Toplu Ürün / Stok
              </button>
              <button
                type="button"
                onClick={() => setImportType('customers')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                  importType === 'customers'
                    ? 'bg-yellow-500 text-gray-950 shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Toplu Müşteri Rehberi
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4">
              {/* Sürükle Bırak Dosya Seçim Alanı */}
              <div className="p-8 border-2 border-dashed border-gray-800 hover:border-yellow-500/50 rounded-2xl bg-gray-950/40 text-center transition-colors">
                <FileSpreadsheet size={36} className="mx-auto text-yellow-500/60 mb-3" />
                <label className="block text-sm font-bold text-white cursor-pointer hover:text-yellow-400">
                  {selectedFile ? selectedFile.name : 'Excel veya CSV Dosyası Seçin'}
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv, .json"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  .xlsx, .xls veya .csv formatında dosyaları yükleyebilirsiniz.
                </p>
              </div>

              {/* Durum Bildirimi */}
              {statusMessage && (
                <div
                  className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    statusMessage.type === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                      : 'bg-red-500/10 border border-red-500/30 text-red-400'
                  }`}
                >
                  {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  {statusMessage.text}
                </div>
              )}

              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-gray-950 font-black text-sm rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-yellow-500/20"
              >
                {uploading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Veriler Yükleniyor...
                  </>
                ) : (
                  <>
                    <Upload size={16} /> Dosyayı Yükle ve Sisteme Aktar
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Sağ Kolon (5 Col): Örnek Şablonlar & Tam Sistem Yedeği */}
          <div className="lg:col-span-5 space-y-6">
            {/* Şablon İndirme Kartı */}
            <div className={`${THEME.GLASS_CARD} p-6 space-y-4`}>
              <h4 className="text-xs font-black text-yellow-400 uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={16} /> Örnek Excel Şablonları
              </h4>
              <p className="text-xs text-gray-400">
                Verilerinizi hazırlarken doğru sütun isimlerini kullanmak için hazır şablonları indirip doldurabilirsiniz:
              </p>

              <div className="space-y-2">
                <button
                  onClick={() => handleDownloadTemplate('stocks')}
                  className="w-full py-2.5 px-3 bg-gray-950 hover:bg-gray-800 border border-gray-800 text-gray-200 text-xs font-bold rounded-xl flex items-center justify-between transition-colors"
                >
                  <span>📦 Örnek Stok Şablonu (.xlsx)</span>
                  <Download size={14} className="text-yellow-400" />
                </button>
                <button
                  onClick={() => handleDownloadTemplate('customers')}
                  className="w-full py-2.5 px-3 bg-gray-950 hover:bg-gray-800 border border-gray-800 text-gray-200 text-xs font-bold rounded-xl flex items-center justify-between transition-colors"
                >
                  <span>👤 Örnek Müşteri Şablonu (.xlsx)</span>
                  <Download size={14} className="text-yellow-400" />
                </button>
              </div>
            </div>

            {/* Tam Sistem Yedeği Alma */}
            <div className={`${THEME.GLASS_CARD} p-6 space-y-4 border border-blue-500/30 bg-blue-500/[0.02]`}>
              <div className="flex items-center gap-2 text-blue-400">
                <Database size={20} />
                <h4 className="text-xs font-black uppercase tracking-wider">Tam Sistem Veritabanı Yedeği</h4>
              </div>
              <p className="text-xs text-gray-400">
                Tüm stokları, müşterileri, toptancıları, kasa oturumlarını ve logları içeren tam bir JSON yedeği indirin.
              </p>
              <button
                onClick={() => handleExport('full_backup', 'json')}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/20"
              >
                <Database size={15} /> Tam Sistem Yedeğini İndir (.json)
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
