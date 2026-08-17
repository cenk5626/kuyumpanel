import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export function registerF02Tests() {
  setTestContext('Tier 1', 2, 'DB Schema Migrations', 'F02: Schema & Migration Integrity');

  describe('Feature 2 - Schema Migrations & Multi-Tenant Data Structures', () => {
    const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma');
    const schemaContent = existsSync(schemaPath) ? readFileSync(schemaPath, 'utf8') : '';

    test('2.1 Should verify prisma schema file exists and defines sqlite/libsql provider', () => {
      expect(schemaContent.length).toBeGreaterThan(0);
      expect(schemaContent).toContain('datasource db');
      expect(schemaContent).toContain('provider = "sqlite"');
    });

    test('2.2 Should contain Customer model with dual balance and dealer multi-tenancy', () => {
      expect(schemaContent).toContain('model Customer');
      expect(schemaContent).toContain('dealerId');
      expect(schemaContent).toContain('transactions CustomerTransaction[]');
    });

    test('2.3 Should contain Supplier model with explicit hasBalance and tlBalance fields', () => {
      expect(schemaContent).toContain('model Supplier');
      expect(schemaContent).toContain('hasBalance');
      expect(schemaContent).toContain('tlBalance');
    });

    test('2.4 Should contain CustomerTransaction with hasEquivalent and unitPrice fields', () => {
      expect(schemaContent).toContain('model CustomerTransaction');
      expect(schemaContent).toContain('hasEquivalent');
      expect(schemaContent).toContain('unitPrice');
      expect(schemaContent).toContain('assetType');
    });

    test('2.5 Should contain ProductItem model with carat, weight, and milyem pricing attributes', () => {
      expect(schemaContent).toContain('model ProductItem');
      expect(schemaContent).toContain('barcode');
      expect(schemaContent).toContain('carat');
      expect(schemaContent).toContain('weight');
      expect(schemaContent).toContain('costMilyem');
      expect(schemaContent).toContain('sellingMilyem');
    });
  });
}
