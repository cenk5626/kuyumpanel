const { createClient } = require('@libsql/client');

const TURSO_URL = 'libsql://kuyumpanel-db-cenk5626.aws-us-east-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQ5MzUzNjcsImlkIjoiMDE5Zjk2NDMtY2EwMS03MjE4LThkYmEtZGE4YjI1MTY3MjI2Iiwia2lkIjoiNWhmQnk2WTN1NkVDazNkLTd5c3BZc3JBRlRWYW1yVFh0emtVd2dCdGtGNCIsInJpZCI6ImUxNTM3NjllLWUxNWMtNDhkNi05MzMzLTlhYjQ0MjFiNTcwOCJ9.grKQ1ZymXrHb9DWwiJ_uP7y7dZyDu5pO4e8Hem-aUB4h6jr7OIJ19FqUpJkqssm5Wdm4wm3nHR32j9inJJ3ZDA';

async function syncAll() {
  const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  console.log('--- TURSO FULL SYNC STARTED ---');

  // Helper to ensure columns exist on any table
  async function ensureColumns(tableName, columns) {
    console.log(`Checking table: ${tableName}...`);
    try {
      const res = await client.execute(`PRAGMA table_info(${tableName});`);
      const existingCols = res.rows.map(r => r.name);
      console.log(`Existing columns for ${tableName}:`, existingCols);

      for (const col of columns) {
        if (!existingCols.includes(col.name)) {
          console.log(`Adding ${col.name} to ${tableName}...`);
          try {
            await client.execute(`ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${col.type};`);
            console.log(`✓ Added ${col.name} to ${tableName}`);
          } catch (e) {
            console.error(`✕ Failed to add ${col.name} to ${tableName}: ${e.message}`);
          }
        }
      }
    } catch (err) {
      console.error(`Error inspecting ${tableName}:`, err.message);
    }
  }

  // 1. ProductItem Diamond 4C Columns
  await ensureColumns('ProductItem', [
    { name: 'isDiamond', type: 'INTEGER DEFAULT 0' },
    { name: 'diamondCarat', type: 'REAL' },
    { name: 'diamondColor', type: 'TEXT' },
    { name: 'diamondClarity', type: 'TEXT' },
    { name: 'diamondCut', type: 'TEXT' },
    { name: 'certificateNo', type: 'TEXT' },
    { name: 'certificateOrg', type: 'TEXT' },
    { name: 'diamondStoneCount', type: 'INTEGER DEFAULT 1' },
    { name: 'costPrice', type: 'REAL' },
    { name: 'sellingMilyem', type: 'REAL' },
    { name: 'size', type: 'TEXT' },
    { name: 'supplierName', type: 'TEXT' }
  ]);

  // 2. Customer credit limits
  await ensureColumns('Customer', [
    { name: 'creditLimitTL', type: 'REAL DEFAULT 0' },
    { name: 'creditLimitHas', type: 'REAL DEFAULT 0' },
    { name: 'tcNo', type: 'TEXT' },
    { name: 'email', type: 'TEXT' },
    { name: 'address', type: 'TEXT' },
    { name: 'note', type: 'TEXT' }
  ]);

  // 3. Dealer AI & WhatsApp
  await ensureColumns('Dealer', [
    { name: 'aiProvider', type: 'TEXT DEFAULT "GEMINI"' },
    { name: 'geminiApiKey', type: 'TEXT' },
    { name: 'openaiApiKey', type: 'TEXT' },
    { name: 'aiModel', type: 'TEXT DEFAULT "gemini-2.0-flash"' },
    { name: 'aiSystemPromptExtra', type: 'TEXT' },
    { name: 'whatsappProvider', type: 'TEXT DEFAULT "WEB_INTENT"' },
    { name: 'whatsappPhone', type: 'TEXT' },
    { name: 'waGatewayInstanceId', type: 'TEXT' },
    { name: 'waGatewayToken', type: 'TEXT' }
  ]);

  // 4. Stock table
  await ensureColumns('Stock', [
    { name: 'minThreshold', type: 'REAL DEFAULT 5' }
  ]);

  // 5. Transaction table
  await ensureColumns('Transaction', [
    { name: 'hasEquivalent', type: 'REAL DEFAULT 0' },
    { name: 'orderNote', type: 'TEXT' },
    { name: 'employeeName', type: 'TEXT' },
    { name: 'customerId', type: 'TEXT' },
    { name: 'sessionId', type: 'TEXT' },
    { name: 'cardFeePercent', type: 'REAL' },
    { name: 'profitAmount', type: 'REAL' },
    { name: 'profitMargin', type: 'REAL' },
    { name: 'costPrice', type: 'REAL' }
  ]);

  // 6. CashRegisterSession
  await ensureColumns('CashRegisterSession', [
    { name: 'openingCashTL', type: 'REAL DEFAULT 0' },
    { name: 'openingCashUSD', type: 'REAL DEFAULT 0' },
    { name: 'openingCashEUR', type: 'REAL DEFAULT 0' },
    { name: 'openingHasGram', type: 'REAL DEFAULT 0' },
    { name: 'systemCashTL', type: 'REAL DEFAULT 0' },
    { name: 'systemCashUSD', type: 'REAL DEFAULT 0' },
    { name: 'systemCashEUR', type: 'REAL DEFAULT 0' },
    { name: 'systemHasGram', type: 'REAL DEFAULT 0' },
    { name: 'systemCardTL', type: 'REAL DEFAULT 0' },
    { name: 'countedCashTL', type: 'REAL' },
    { name: 'countedCashUSD', type: 'REAL' },
    { name: 'countedCashEUR', type: 'REAL' },
    { name: 'countedHasGram', type: 'REAL' },
    { name: 'diffCashTL', type: 'REAL' },
    { name: 'diffCashUSD', type: 'REAL' },
    { name: 'diffCashEUR', type: 'REAL' },
    { name: 'diffHasGram', type: 'REAL' }
  ]);

  // 7. StockAuditSession Table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS StockAuditSession (
      id TEXT PRIMARY KEY,
      sessionNumber TEXT NOT NULL,
      dealerId TEXT NOT NULL,
      scope TEXT NOT NULL DEFAULT 'ALL',
      categoryFilter TEXT,
      status TEXT NOT NULL DEFAULT 'COMPLETED',
      totalExpected INTEGER NOT NULL DEFAULT 0,
      totalCounted INTEGER NOT NULL DEFAULT 0,
      totalMissing INTEGER NOT NULL DEFAULT 0,
      totalSurplus INTEGER NOT NULL DEFAULT 0,
      expectedWeight REAL NOT NULL DEFAULT 0,
      countedWeight REAL NOT NULL DEFAULT 0,
      weightDiff REAL NOT NULL DEFAULT 0,
      scannedBarcodes TEXT NOT NULL DEFAULT '[]',
      missingItems TEXT NOT NULL DEFAULT '[]',
      auditedBy TEXT NOT NULL,
      notes TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dealerId) REFERENCES Dealer(id) ON DELETE CASCADE
    );
  `);

  // Ensure any newer columns on StockAuditSession
  await ensureColumns('StockAuditSession', [
    { name: 'weightDiff', type: 'REAL DEFAULT 0' },
    { name: 'scannedBarcodes', type: 'TEXT DEFAULT "[]"' },
    { name: 'missingItems', type: 'TEXT DEFAULT "[]"' },
    { name: 'auditedBy', type: 'TEXT DEFAULT "Yönetici"' }
  ]);

  // 8. PriceAlert Table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS PriceAlert (
      id TEXT PRIMARY KEY,
      dealerId TEXT NOT NULL,
      productCode TEXT NOT NULL,
      productLabel TEXT NOT NULL,
      targetPrice REAL NOT NULL,
      priceType TEXT NOT NULL DEFAULT 'bid',
      condition TEXT NOT NULL DEFAULT 'GTE',
      phone TEXT,
      isActive INTEGER NOT NULL DEFAULT 1,
      isTriggered INTEGER NOT NULL DEFAULT 0,
      triggeredAt DATETIME,
      lastCheckedPrice REAL,
      notes TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dealerId) REFERENCES Dealer(id) ON DELETE CASCADE
    );
  `);

  console.log('--- ALL TABLES AND COLUMNS FULLY SYNCHRONIZED ON TURSO CLOUD DB ---');
}

syncAll().catch(console.error);
