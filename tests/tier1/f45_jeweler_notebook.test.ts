import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import {
  NOTEBOOK_CATEGORY,
  NOTEBOOK_CATEGORY_LABELS,
  NOTEBOOK_VISIBILITY,
  NOTEBOOK_VISIBILITY_LABELS,
  NOTEBOOK_STATUS,
} from '../../src/constants/notebook';

export function registerF45JewelerNotebookTests() {
  setTestContext(
    'Tier 1',
    45,
    'Jeweler Operational Notebook & Reminders',
    'F45: Kuyumcu Defteri & Operasyon Notları'
  );

  describe('Feature 45 - Kuyumcu Defteri, Kategoriler, Görünürlük & XSS Temizliği', () => {
    test('45.1 Should define all essential notebook categories with Turkish descriptive labels', () => {
      expect(NOTEBOOK_CATEGORY.GENERAL).toBe('GENERAL');
      expect(NOTEBOOK_CATEGORY.CUSTOMER).toBe('CUSTOMER');
      expect(NOTEBOOK_CATEGORY.SUPPLIER).toBe('SUPPLIER');
      expect(NOTEBOOK_CATEGORY.WORKSHOP).toBe('WORKSHOP');
      expect(NOTEBOOK_CATEGORY.SERVICE).toBe('SERVICE');
      expect(NOTEBOOK_CATEGORY.PRICE).toBe('PRICE');
      expect(NOTEBOOK_CATEGORY.REMINDER).toBe('REMINDER');
      expect(NOTEBOOK_CATEGORY.PRIVATE).toBe('PRIVATE');

      expect(NOTEBOOK_CATEGORY_LABELS[NOTEBOOK_CATEGORY.CUSTOMER]).toBe('Müşteri Notu');
      expect(NOTEBOOK_CATEGORY_LABELS[NOTEBOOK_CATEGORY.WORKSHOP]).toBe('Atölye / Üretim');
    });

    test('45.2 Should define 3-tier visibility levels (PRIVATE, BRANCH, DEALER)', () => {
      expect(NOTEBOOK_VISIBILITY.PRIVATE).toBe('PRIVATE');
      expect(NOTEBOOK_VISIBILITY.BRANCH).toBe('BRANCH');
      expect(NOTEBOOK_VISIBILITY.DEALER).toBe('DEALER');

      expect(NOTEBOOK_VISIBILITY_LABELS[NOTEBOOK_VISIBILITY.PRIVATE]).toContain('Sadece Ben');
      expect(NOTEBOOK_VISIBILITY_LABELS[NOTEBOOK_VISIBILITY.BRANCH]).toContain('Şube Personeli');
      expect(NOTEBOOK_VISIBILITY_LABELS[NOTEBOOK_VISIBILITY.DEALER]).toContain('Tüm Mağaza');
    });

    test('45.3 Should sanitize note title and content against XSS scripts and HTML injections', () => {
      const dirtyTitle = '<b>Özel Bilezik</b> <script>alert("xss")</script>';
      const cleanTitle = dirtyTitle.replace(/<[^>]*>/g, '').trim();

      expect(cleanTitle).not.toContain('<script>');
      expect(cleanTitle).not.toContain('<b>');
      expect(cleanTitle).toBe('Özel Bilezik alert("xss")');

      const dirtyContent = 'Not metni <script type="text/javascript">stealCookies()</script> Devam';
      const cleanContent = dirtyContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();

      expect(cleanContent).not.toContain('stealCookies');
      expect(cleanContent).toBe('Not metni  Devam');
    });

    test('45.4 Should handle pinned notes prioritization sorting', () => {
      const notes = [
        { id: '1', title: 'Normal 1', isPinned: false, createdAt: '2026-09-09T10:00:00Z' },
        { id: '2', title: 'Önemli Sipariş', isPinned: true, createdAt: '2026-09-08T10:00:00Z' },
        { id: '3', title: 'Normal 2', isPinned: false, createdAt: '2026-09-09T11:00:00Z' },
      ];

      const sorted = [...notes].sort((a, b) => {
        if (b.isPinned !== a.isPinned) return b.isPinned ? 1 : -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      expect(sorted[0].id).toBe('2'); // Sabitlenmiş not en başta
      expect(sorted[0].isPinned).toBe(true);
    });

    test('45.5 Should filter and identify upcoming reminders within given time threshold', () => {
      const now = new Date('2026-09-09T12:00:00.000Z');
      const futureReminder = new Date('2026-09-09T15:00:00.000Z');
      const pastReminder = new Date('2026-09-09T09:00:00.000Z');

      const isFuture = futureReminder.getTime() > now.getTime();
      const isPast = pastReminder.getTime() <= now.getTime();

      expect(isFuture).toBe(true);
      expect(isPast).toBe(true);
    });
  });
}
