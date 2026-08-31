const { createClient } = require('@libsql/client');

const TURSO_URL = 'libsql://kuyumpanel-db-cenk5626.aws-us-east-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQ5MzUzNjcsImlkIjoiMDE5Zjk2NDMtY2EwMS03MjE4LThkYmEtZGE4YjI1MTY3MjI2Iiwia2lkIjoiNWhmQnk2WTN1NkVDazNkLTd5c3BZc3JBRlRWYW1yVFh0emtVd2dCdGtGNCIsInJpZCI6ImUxNTM3NjllLWUxNWMtNDhkNi05MzMzLTlhYjQ0MjFiNTcwOCJ9.grKQ1ZymXrHb9DWwiJ_uP7y7dZyDu5pO4e8Hem-aUB4h6jr7OIJ19FqUpJkqssm5Wdm4wm3nHR32j9inJJ3ZDA';

async function migrate() {
  const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  
  console.log('Fetching columns for Dealer table on Turso...');
  const res = await client.execute("PRAGMA table_info(Dealer);");
  const existingCols = res.rows.map(r => r.name);
  console.log('Existing columns on Turso:', existingCols);

  const columnsToAdd = [
    { name: 'aiProvider', type: 'TEXT DEFAULT "GEMINI"' },
    { name: 'geminiApiKey', type: 'TEXT' },
    { name: 'openaiApiKey', type: 'TEXT' },
    { name: 'aiModel', type: 'TEXT DEFAULT "gemini-2.0-flash"' },
    { name: 'aiSystemPromptExtra', type: 'TEXT' },
    { name: 'whatsappProvider', type: 'TEXT DEFAULT "WEB_INTENT"' },
    { name: 'whatsappPhone', type: 'TEXT' },
    { name: 'waCloudAccessToken', type: 'TEXT' },
    { name: 'waCloudPhoneId', type: 'TEXT' },
    { name: 'waCloudBusinessId', type: 'TEXT' },
    { name: 'waGatewayInstanceId', type: 'TEXT' },
    { name: 'waGatewayToken', type: 'TEXT' },
  ];

  for (const col of columnsToAdd) {
    if (!existingCols.includes(col.name)) {
      console.log(`Adding column ${col.name} to Turso Dealer table...`);
      try {
        await client.execute(`ALTER TABLE Dealer ADD COLUMN ${col.name} ${col.type};`);
        console.log(`Successfully added ${col.name}!`);
      } catch (err) {
        console.error(`Error adding ${col.name}:`, err.message);
      }
    } else {
      console.log(`Column ${col.name} already exists.`);
    }
  }

  // Also check if PriceAlert and StockAuditSession tables exist on Turso
  const tablesRes = await client.execute("SELECT name FROM sqlite_master WHERE type='table';");
  const tableNames = tablesRes.rows.map(r => r.name);
  console.log('Existing tables on Turso:', tableNames);

  // If PriceAlert doesn't exist, create it
  if (!tableNames.includes('PriceAlert')) {
    console.log('Creating PriceAlert table on Turso...');
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
    console.log('PriceAlert table created!');
  }

  // If StockAuditSession doesn't exist, create it
  if (!tableNames.includes('StockAuditSession')) {
    console.log('Creating StockAuditSession table on Turso...');
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
        missingWeight REAL NOT NULL DEFAULT 0,
        surplusWeight REAL NOT NULL DEFAULT 0,
        countedBy TEXT NOT NULL,
        notes TEXT,
        itemsJson TEXT NOT NULL,
        discrepanciesJson TEXT NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dealerId) REFERENCES Dealer(id) ON DELETE CASCADE
      );
    `);
    console.log('StockAuditSession table created!');
  }

  console.log('Turso cloud database migration finished successfully!');
}

migrate().catch(console.error);
