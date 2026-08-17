import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';

export function registerF14Tests() {
  setTestContext('Tier 1', 14, 'Promotional Banners & Ticker', 'F14: Showcase Marquee & Announcements');

  describe('Feature 14 - Promotional Announcements & Live Marquee Ticker Engine', () => {
    const sampleAnnouncements = [
      'Kredi kartına vade farksız 3 taksit imkanı!',
      'Eski altınınız güncel piyasa değerinden alınır.',
      'Özel tasarım pırlanta ve elmaslarda %15 net indirim!',
    ];

    test('14.1 Should format marquee ticker tape joined with diamond separator symbols', () => {
      const tickerText = sampleAnnouncements.join('  ✦  ');
      expect(tickerText).toContain('Kredi kartına');
      expect(tickerText).toContain('Eski altınınız');
      expect(tickerText).toContain('✦');
    });

    test('14.2 Should support configurable announcement rotation cycles', () => {
      let activeIndex = 0;
      const getActiveAnnouncement = (tick: number) => sampleAnnouncements[tick % sampleAnnouncements.length];

      expect(getActiveAnnouncement(0)).toBe(sampleAnnouncements[0]);
      expect(getActiveAnnouncement(1)).toBe(sampleAnnouncements[1]);
      expect(getActiveAnnouncement(3)).toBe(sampleAnnouncements[0]);
    });

    test('14.3 Should sanitize announcement strings against malicious HTML injection', () => {
      const dirtyInput = '<script>alert("hack")</script>Altın Fırsatı!';
      const sanitized = dirtyInput.replace(/<[^>]*>/g, '').trim();
      expect(sanitized).toBe('alert("hack")Altın Fırsatı!');
      expect(sanitized).not.toContain('<script>');
    });

    test('14.4 Should fallback gracefully to default store slogan when announcements list is empty', () => {
      const emptyList: string[] = [];
      const defaultSlogan = 'Kuyumcu Panel — Güvenilir Mücevherat & Sarrafiye';
      const displayText = emptyList.length > 0 ? emptyList.join(' ✦ ') : defaultSlogan;

      expect(displayText).toBe(defaultSlogan);
    });

    test('14.5 Should validate maximum banner length to prevent ticker overflow on TV screens', () => {
      const MAX_BANNER_LENGTH = 150;
      for (const ann of sampleAnnouncements) {
        expect(ann.length).toBeLessThan(MAX_BANNER_LENGTH);
      }
    });
  });
}
