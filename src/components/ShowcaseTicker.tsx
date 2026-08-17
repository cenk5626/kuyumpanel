'use client';

import React, { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { SHOWCASE_CONFIG, SHOWCASE_PROMOTIONS } from '@/constants/showcase';
import { MESSAGES } from '@/constants/messages';

export interface ShowcaseTickerProps {
  announcements?: readonly string[] | string[];
  liveSummaryText?: string;
  speedSeconds?: number;
  showBadge?: boolean;
}

/**
 * HTML etiketlerini ve zararlı karakterleri temizler
 */
export function sanitizeAnnouncement(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .trim();
}

/**
 * Duyuruları ayırıcı sembolü ile birleştirerek kayan yazı bandı metni oluşturur
 */
export function buildTickerTape(
  items: readonly string[] | string[],
  separator: string = SHOWCASE_CONFIG.SEPARATOR_SYMBOL
): string {
  const sanitized = items
    .map(sanitizeAnnouncement)
    .filter(item => item.length > 0 && item.length <= SHOWCASE_CONFIG.MAX_BANNER_LENGTH);

  if (sanitized.length === 0) {
    return SHOWCASE_CONFIG.DEFAULT_ANNOUNCEMENT;
  }

  return sanitized.join(`  ${separator}  `);
}

export default function ShowcaseTicker({
  announcements = SHOWCASE_PROMOTIONS,
  liveSummaryText,
  speedSeconds = SHOWCASE_CONFIG.TICKER_SPEED_SECONDS,
  showBadge = true,
}: ShowcaseTickerProps) {
  const tickerText = useMemo(() => {
    const list = announcements && announcements.length > 0 ? announcements : SHOWCASE_PROMOTIONS;
    const bannerTape = buildTickerTape(list, SHOWCASE_CONFIG.SEPARATOR_SYMBOL);
    if (liveSummaryText && liveSummaryText.trim().length > 0) {
      return `${liveSummaryText.trim()}  ${SHOWCASE_CONFIG.SEPARATOR_SYMBOL}  ${bannerTape}`;
    }
    return bannerTape;
  }, [announcements, liveSummaryText]);

  return (
    <footer className="relative w-full bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 border-t border-yellow-900/30 py-3 px-4 shadow-2xl overflow-hidden flex items-center z-20 select-none">
      {/* Sol Duyuru Başlık Rozeti */}
      {showBadge && (
        <div className="flex-shrink-0 flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border border-yellow-500/40 text-yellow-400 font-bold text-xs uppercase tracking-widest mr-4 z-10 shadow-lg shadow-black/50">
          <Sparkles size={14} className="text-yellow-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span>{MESSAGES.SHOWCASE_ANNOUNCEMENT_HEADER}</span>
        </div>
      )}

      {/* Kesintisiz Kayan Yazı Konteynırı */}
      <div className="relative flex-1 overflow-hidden flex items-center">
        {/* Sol & Sağ Karartma Gradyanları */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-950 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-950 to-transparent z-10 pointer-events-none" />

        <div
          className="flex whitespace-nowrap will-change-transform font-mono font-medium text-sm md:text-base lg:text-lg text-yellow-100/90 tracking-wider items-center"
          style={{
            animation: `showcaseMarquee ${speedSeconds}s linear infinite`,
          }}
        >
          <span className="inline-block px-4">{tickerText}</span>
          <span className="inline-block px-4 text-yellow-500 font-bold">{SHOWCASE_CONFIG.SEPARATOR_SYMBOL}</span>
          <span className="inline-block px-4">{tickerText}</span>
          <span className="inline-block px-4 text-yellow-500 font-bold">{SHOWCASE_CONFIG.SEPARATOR_SYMBOL}</span>
          <span className="inline-block px-4">{tickerText}</span>
        </div>
      </div>

      {/* Marquee Keyframes Inline Stili */}
      <style jsx>{`
        @keyframes showcaseMarquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
      `}</style>
    </footer>
  );
}
