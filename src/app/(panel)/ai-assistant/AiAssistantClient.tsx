'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Send,
  Sparkles,
  Mic,
  MicOff,
  Settings,
  Share2,
  TrendingUp,
  AlertTriangle,
  Package,
  UserCheck,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { THEME } from '@/constants/theme';
import { MESSAGES } from '@/constants/messages';
import { ROUTES } from '@/constants/routes';
import HeaderActions from '@/components/HeaderActions';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const PROMPT_SUGGESTIONS = [
  { icon: TrendingUp, label: 'Kârlılık & Ciro', text: 'Bu ayki tahmini ciro, kârlılık oranları ve nakit akışımı özetle.' },
  { icon: AlertTriangle, label: 'Kritik Stoklar', text: 'Stoğu azalan veya tükenmek üzere olan takıları ve sipariş önerilerini listele.' },
  { icon: UserCheck, label: 'Müşteri Borçları', text: 'Has altın ve TL borcu en yüksek olan müşterileri ve tahsilat risklerini değerlendir.' },
  { icon: Package, label: 'Pırlanta Envanteri', text: 'Stoktaki pırlanta ürünlerimizin toplam karat, renk ve sertifika dağılımını göster.' },
];

export default function AiAssistantClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Selamlar Patron! 👑 Ben sizin **Kuyumcu Asistanı ve Finans Danışmanınızım**.

Mağazanızın anlık **vitrin stoklarını, kasa nakitlerini, müşteri borç/alacaklarını ve canlı altın kurlarını** sürekli takip ediyorum.

Aşağıdaki hızlı analiz butonlarından birini seçebilir veya aklınıza gelen herhangi bir soruyu doğrudan yazabilir/sesli söyleyebilirsiniz. Size nasıl yardımcı olabilirim?`,
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if dealer has configured API Key
  useEffect(() => {
    const checkSettings = async () => {
      try {
        const res = await fetch('/api/dealer/ai-settings');
        if (res.ok) {
          const data = await res.json();
          if (!data.geminiApiKeyMasked && !data.openaiApiKeyMasked) {
            setHasApiKey(false);
          }
        }
      } catch {
        /* quiet */
      }
    };
    checkSettings();
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Handle Send Message
  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setLoading(true);

    try {
      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      const data = await res.json();
      if (res.ok && data.content) {
        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.content,
          timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `⚠️ **Hata:** ${data.error || 'Yapay zeka yanıt üretemedi. Lütfen API anahtarınızı Ayarlar sayfasından kontrol ediniz.'}`,
          timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `⚠️ **Bağlantı Hatası:** ${err.message}`,
          timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Generate Executive Briefing
  const handleGenerateBriefing = async () => {
    handleSendMessage('Lütfen mağazam için detaylı bir "Yönetim & Patron Brifingi" hazırla. Güncel kâr, stok ve tahsilat risklerini çıkar.');
  };

  // Speech to Text (Web Speech API)
  const toggleSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Tarayıcınız sesli konuşma tanıma özelliğini desteklemiyor.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'tr-TR';
    recognition.interimResults = false;

    if (!isRecording) {
      setIsRecording(true);
      recognition.start();

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputQuery(transcript);
        setIsRecording(false);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };
    } else {
      setIsRecording(false);
      recognition.stop();
    }
  };

  // Copy text to clipboard
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Share message via WhatsApp
  const handleShareWhatsApp = (text: string) => {
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <>
      <header className={THEME.HEADER}>
        <div className="flex justify-between items-center w-full flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-2xl shadow-lg shadow-yellow-500/10">
              <Bot size={22} />
            </div>
            <div>
              <h1 className={`${THEME.HEADER_TITLE} flex items-center gap-2`}>
                {MESSAGES.AI_ASSISTANT_TITLE}
                <span className="px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-[10px] font-black rounded-full uppercase tracking-wider">
                  Canlı Danışman
                </span>
              </h1>
              <p className="text-gray-400 text-xs mt-0.5">{MESSAGES.AI_ASSISTANT_SUBTITLE}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={ROUTES.SETTINGS_AI}
              className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-750 text-gray-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Settings size={14} className="text-yellow-400" /> API & WhatsApp Ayarları
            </Link>
            <HeaderActions />
          </div>
        </div>
      </header>

      <div className={`${THEME.PAGE_WRAPPER} max-w-5xl mx-auto flex flex-col h-[calc(100vh-140px)]`}>
        {/* API Key Missing Warning Banner */}
        {!hasApiKey && (
          <div className="mb-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-400 shrink-0" />
              <span>
                Yapay Zeka API anahtarınız henüz tanımlanmamış. Ücretsiz Google Gemini veya OpenAI anahtarınızı bağlayarak sınırsız analitiği başlatabilirsiniz.
              </span>
            </div>
            <Link
              href={ROUTES.SETTINGS_AI}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-gray-950 font-black rounded-xl text-xs shrink-0 transition-colors"
            >
              Anahtar Ekle
            </Link>
          </div>
        )}

        {/* ─── SOHBET GEÇMİŞİ ALANI ─── */}
        <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-2xl bg-gray-950/40 border border-gray-850 shadow-inner">
          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 flex items-center justify-center shrink-0 mt-1">
                    <Sparkles size={16} />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-yellow-500 text-gray-950 font-semibold rounded-tr-none shadow-md shadow-yellow-500/10'
                      : 'bg-gray-900 border border-gray-800 text-gray-100 rounded-tl-none space-y-2'
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

                  <div className="flex items-center justify-between gap-4 pt-2 mt-2 border-t border-white/10 text-[10px] opacity-70">
                    <span>{msg.timestamp}</span>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="hover:text-yellow-400 transition-colors flex items-center gap-1"
                          title="Kopyala"
                        >
                          {copiedId === msg.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          <span>{copiedId === msg.id ? 'Kopyalandı' : 'Kopyala'}</span>
                        </button>
                        <button
                          onClick={() => handleShareWhatsApp(msg.content)}
                          className="hover:text-emerald-400 transition-colors flex items-center gap-1"
                          title="WhatsApp ile Paylaş"
                        >
                          <Share2 size={12} />
                          <span>WhatsApp</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 text-gray-400 text-xs p-3"
              >
                <div className="w-8 h-8 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center">
                  <RefreshCw size={14} className="animate-spin" />
                </div>
                <span>Patron Asistanı canlı verilerinizi analiz ediyor...</span>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* ─── HIZLI ÖNERİ BUTONLARI ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-3">
          {PROMPT_SUGGESTIONS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSendMessage(item.text)}
                disabled={loading}
                className="p-2.5 bg-gray-900/80 hover:bg-gray-850 border border-gray-800 hover:border-yellow-500/40 rounded-xl text-left transition-all group disabled:opacity-50"
              >
                <div className="flex items-center gap-1.5 text-yellow-400 text-xs font-bold mb-0.5">
                  <Icon size={13} />
                  <span>{item.label}</span>
                </div>
                <p className="text-[11px] text-gray-400 group-hover:text-gray-200 line-clamp-1">
                  {item.text}
                </p>
              </button>
            );
          })}
        </div>

        {/* ─── MESAJ GİRİŞ FORMU & SESLİ GİRİŞ ─── */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 pt-1"
        >
          {/* Haftalık Rapor Butonu */}
          <button
            type="button"
            onClick={handleGenerateBriefing}
            disabled={loading}
            title="Detaylı Yönetim Brifingi İste"
            className="px-3.5 py-3.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0"
          >
            <Sparkles size={16} />
            <span className="hidden sm:inline">Brifing Çıkar</span>
          </button>

          {/* Soru Giriş Alanı */}
          <div className="relative flex-1">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={MESSAGES.AI_CHAT_PLACEHOLDER}
              disabled={loading}
              className="w-full pl-4 pr-11 py-3.5 bg-gray-900 border border-gray-750 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/30 rounded-2xl text-white text-xs sm:text-sm placeholder:text-gray-500 transition-all outline-none"
            />
            {/* Mikrofon ile Sesli Soru */}
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl transition-all ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'text-gray-400 hover:text-yellow-400 hover:bg-gray-800'
              }`}
              title={isRecording ? 'Dinleniyor... (Durdurmak için tıklayın)' : 'Sesli Soru Sor'}
            >
              {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          </div>

          {/* Gönder Butonu */}
          <button
            type="submit"
            disabled={loading || !inputQuery.trim()}
            className="p-3.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-gray-950 rounded-2xl font-black transition-all shadow-md shadow-yellow-500/20 shrink-0"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </>
  );
}
