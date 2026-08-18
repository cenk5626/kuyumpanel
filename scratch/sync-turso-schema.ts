import { createClient } from '@libsql/client';

const TURSO_URL = 'libsql://kuyumpanel-db-cenk5626.aws-us-east-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQ5MzUzNjcsImlkIjoiMDE5Zjk2NDMtY2EwMS03MjE4LThkYmEtZGE4YjI1MTY3MjI2Iiwia2lkIjoiNWhmQnk2WTN1NkVDazNkLTd5c3BZc3JBRlRWYW1yVFh0emtVd2dCdGtGNCIsInJpZCI6ImUxNTM3NjllLWUxNWMtNDhkNi05MzMzLTlhYjQ0MjFiNTcwOCJ9.grKQ1ZymXrHb9DWwiJ_uP7y7dZyDu5pO4e8Hem-aUB4h6jr7OIJ19FqUpJkqssm5Wdm4wm3nHR32j9inJJ3ZDA';

async function syncTurso() {
  const client = createClient({
    url: TURSO_URL,
    authToken: TURSO_TOKEN,
  });

  console.log('Syncing columns with Turso cloud DB...');

  const queries = [
    `ALTER TABLE "Customer" ADD COLUMN "creditLimitTL" REAL DEFAULT 0;`,
    `ALTER TABLE "Customer" ADD COLUMN "creditLimitHas" REAL DEFAULT 0;`,
    `ALTER TABLE "Transaction" ADD COLUMN "costPrice" REAL;`,
    `ALTER TABLE "Transaction" ADD COLUMN "profitAmount" REAL;`,
    `ALTER TABLE "Transaction" ADD COLUMN "profitMargin" REAL;`,
    `ALTER TABLE "Transaction" ADD COLUMN "isSuspicious" INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE "Transaction" ADD COLUMN "suspiciousReason" TEXT;`,
    `ALTER TABLE "Transaction" ADD COLUMN "isDeleted" INTEGER NOT NULL DEFAULT 0;`,
    `ALTER TABLE "SupplierTransaction" ADD COLUMN "targetSupplierId" TEXT;`,
    `ALTER TABLE "SupplierTransaction" ADD COLUMN "targetSupplierName" TEXT;`,
    `CREATE TABLE IF NOT EXISTS "TransactionRevisionLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "transactionId" TEXT NOT NULL,
      "dealerId" TEXT NOT NULL,
      "actionType" TEXT NOT NULL,
      "previousData" TEXT NOT NULL,
      "newData" TEXT,
      "reason" TEXT NOT NULL,
      "userEmail" TEXT,
      "userName" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TransactionRevisionLog_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "TransactionRevisionLog_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
  ];

  for (const q of queries) {
    try {
      await client.execute(q);
      console.log('✓ Executed:', q.slice(0, 50));
    } catch (e: any) {
      if (e.message?.includes('duplicate column') || e.message?.includes('already exists')) {
        console.log('ℹ Already exists:', q.slice(0, 50));
      } else {
        console.warn('⚠️ Notice:', e.message);
      }
    }
  }

  console.log('Turso synchronization complete!');
  process.exit(0);
}

syncTurso().catch((err) => {
  console.error(err);
  process.exit(1);
});
