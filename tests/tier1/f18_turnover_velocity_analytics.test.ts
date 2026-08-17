import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import {
  calculateTurnoverMetric,
  TURNOVER_SPEEDS,
} from '../helpers/domain-engines';

export function registerF18Tests() {
  setTestContext('Tier 1', 18, 'Stock Turnover Velocity Analytics', 'F18: Velocity & Circulation Analytics');

  describe('Feature 18 - Stock Turnover Velocity & Circulation Speed Engine', () => {
    test('18.1 Should calculate daily velocity as sales quantity divided by window days', () => {
      // 60 sales over 30 days = 2.0 items/day
      const metric = calculateTurnoverMetric('22BLZ', '22K Bilezik', 20, 60, 30);
      expect(metric.dailyVelocity).toBe(2.0);
    });

    test('18.2 Should classify high-velocity fast moving items as HIZLI', () => {
      // 45 sales over 30 days = 1.5/day -> current stock 15 -> days to stockout = 10 days <= 14 days
      const metric = calculateTurnoverMetric('14KP', '14K Kolye', 15, 45, 30);
      expect(metric.dailyVelocity).toBe(1.5);
      expect(metric.daysToStockout).toBe(10.0);
      expect(metric.speed).toBe(TURNOVER_SPEEDS.HIZLI);
    });

    test('18.3 Should classify moderate velocity items with 15-45 days remaining as NORMAL', () => {
      // 15 sales over 30 days = 0.5/day -> current stock 15 -> days to stockout = 30 days
      const metric = calculateTurnoverMetric('18YZK', '18K Yüzük', 15, 15, 30);
      expect(metric.dailyVelocity).toBe(0.5);
      expect(metric.daysToStockout).toBe(30.0);
      expect(metric.speed).toBe(TURNOVER_SPEEDS.NORMAL);
    });

    test('18.4 Should classify slow moving items with >45 days remaining as YAVAS', () => {
      // 5 sales over 30 days = 0.167/day -> current stock 20 -> days to stockout = ~120 days
      const metric = calculateTurnoverMetric('ELMAS', 'Elmas Broş', 20, 5, 30);
      expect(metric.speed).toBe(TURNOVER_SPEEDS.YAVAS);
      expect(metric.daysToStockout).toBeGreaterThan(45);
    });

    test('18.5 Should classify items with zero sales in period as HAREKETSIZ (Dead Stock)', () => {
      const metric = calculateTurnoverMetric('ESKI_MODEL', 'Eski Model Gerdanlık', 8, 0, 30);
      expect(metric.dailyVelocity).toBe(0);
      expect(metric.daysToStockout).toBe(Infinity);
      expect(metric.speed).toBe(TURNOVER_SPEEDS.HAREKETSIZ);
    });
  });
}
