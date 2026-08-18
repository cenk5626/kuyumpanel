import { createClient } from '@libsql/client';

const TURSO_URL = 'libsql://kuyumpanel-db-cenk5626.aws-us-east-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQ5MzUzNjcsImlkIjoiMDE5Zjk2NDMtY2EwMS03MjE4LThkYmEtZGE4YjI1MTY3MjI2Iiwia2lkIjoiNWhmQnk2WTN1NkVDazNkLTd5c3BZc3JBRlRWYW1yVFh0emtVd2dCdGtGNCIsInJpZCI6ImUxNTM3NjllLWUxNWMtNDhkNi05MzMzLTlhYjQ0MjFiNTcwOCJ9.grKQ1ZymXrHb9DWwiJ_uP7y7dZyDu5pO4e8Hem-aUB4h6jr7OIJ19FqUpJkqssm5Wdm4wm3nHR32j9inJJ3ZDA';

async function syncAllTables() {
  const client = createClient({
    url: TURSO_URL,
    authToken: TURSO_TOKEN,
  });

  console.log('Synchronizing Turso DB Tables & Columns...');

  // 1. Transaction Table Missing Columns
  const txColumns = [
    `ALTER TABLE "Transaction" ADD COLUMN "paymentMethod" TEXT NOT NULL DEFAULT 'CASH';`,
    `ALTER TABLE "Transaction" ADD COLUMN "cardFeePercent" REAL;`,
    `ALTER TABLE "Transaction" ADD COLUMN "hasEquivalent" REAL DEFAULT 0;`,
    `ALTER TABLE "Transaction" ADD COLUMN "orderNote" TEXT;`,
    `ALTER TABLE "Transaction" ADD COLUMN "customerId" TEXT;`,
    `ALTER TABLE "Transaction" ADD COLUMN "sessionId" TEXT;`,
  ];

  for (const col of txColumns) {
    try {
      await client.execute(col);
      console.log('✓ Added column:', col);
    } catch (e: any) {
      if (e.message?.includes('duplicate column') || e.message?.includes('already exists')) {
        console.log('ℹ Already exists:', col.slice(0, 40));
      } else {
        console.warn('⚠️ Notice:', e.message);
      }
    }
  }

  // 2. CashRegisterSession Table
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "CashRegisterSession" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "sessionNumber" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'OPEN',
        "openingCash" REAL NOT NULL DEFAULT 0,
        "closingCash" REAL,
        "systemCash" REAL NOT NULL DEFAULT 0,
        "countedCash" REAL,
        "discrepancy" REAL,
        "notes" TEXT,
        "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "closedAt" DATETIME,
        "openedBy" TEXT NOT NULL,
        "closedBy" TEXT,
        "openingCashTL" REAL NOT NULL DEFAULT 0,
        "openingCashUSD" REAL NOT NULL DEFAULT 0,
        "openingCashEUR" REAL NOT NULL DEFAULT 0,
        "openingHasGram" REAL NOT NULL DEFAULT 0,
        "systemCashTL" REAL NOT NULL DEFAULT 0,
        "systemCashUSD" REAL NOT NULL DEFAULT 0,
        "systemCashEUR" REAL NOT NULL DEFAULT 0,
        "systemHasGram" REAL NOT NULL DEFAULT 0,
        "systemCardTL" REAL NOT NULL DEFAULT 0,
        "countedCashTL" REAL,
        "countedCashUSD" REAL,
        "countedCashEUR" REAL,
        "countedHasGram" REAL,
        "diffCashTL" REAL,
        "diffCashUSD" REAL,
        "diffCashEUR" REAL,
        "diffHasGram" REAL,
        "dealerId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CashRegisterSession_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    console.log('✓ Created CashRegisterSession table');
  } catch (e: any) {
    console.log('Notice CashRegisterSession:', e.message);
  }

  // 3. CashMovement Table
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "CashMovement" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "sessionId" TEXT NOT NULL,
        "dealerId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "category" TEXT,
        "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
        "amount" REAL NOT NULL,
        "currency" TEXT NOT NULL DEFAULT 'TL',
        "hasEquivalent" REAL DEFAULT 0,
        "description" TEXT NOT NULL,
        "referenceId" TEXT,
        "employeeName" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CashMovement_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CashRegisterSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "CashMovement_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    console.log('✓ Created CashMovement table');
  } catch (e: any) {
    console.log('Notice CashMovement:', e.message);
  }

  // 4. ProductItem missing columns
  const productColumns = [
    `ALTER TABLE "ProductItem" ADD COLUMN "sellingMilyem" REAL;`,
    `ALTER TABLE "ProductItem" ADD COLUMN "laborType" TEXT DEFAULT 'milyem';`,
    `ALTER TABLE "ProductItem" ADD COLUMN "laborCost" REAL DEFAULT 0;`,
    `ALTER TABLE "ProductItem" ADD COLUMN "supplierName" TEXT;`,
  ];

  for (const col of productColumns) {
    try {
      await client.execute(col);
      console.log('✓ Added column:', col);
    } catch (e: any) {
      if (e.message?.includes('duplicate column') || e.message?.includes('already exists')) {
        console.log('ℹ Already exists:', col.slice(0, 40));
      } else {
        console.warn('⚠️ Notice:', e.message);
      }
    }
  }

  console.log('All Turso schema sync finished successfully!');
}

syncAllTables().catch(console.error);
