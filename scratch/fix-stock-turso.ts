import { createClient } from '@libsql/client';

const TURSO_URL = 'libsql://kuyumpanel-db-cenk5626.aws-us-east-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQ5MzUzNjcsImlkIjoiMDE5Zjk2NDMtY2EwMS03MjE4LThkYmEtZGE4YjI1MTY3MjI2Iiwia2lkIjoiNWhmQnk2WTN1NkVDazNkLTd5c3BZc3JBRlRWYW1yVFh0emtVd2dCdGtGNCIsInJpZCI6ImUxNTM3NjllLWUxNWMtNDhkNi05MzMzLTlhYjQ0MjFiNTcwOCJ9.grKQ1ZymXrHb9DWwiJ_uP7y7dZyDu5pO4e8Hem-aUB4h6jr7OIJ19FqUpJkqssm5Wdm4wm3nHR32j9inJJ3ZDA';

async function updateStockSchema() {
  const client = createClient({
    url: TURSO_URL,
    authToken: TURSO_TOKEN,
  });

  console.log('Adding minThreshold to Stock table...');
  try {
    await client.execute(`ALTER TABLE "Stock" ADD COLUMN "minThreshold" REAL DEFAULT 5;`);
    console.log('✓ minThreshold column added to Stock!');
  } catch (e: any) {
    console.log('Notice on minThreshold:', e.message);
  }

  try {
    await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS "Stock_product_dealerId_key" ON "Stock"("product", "dealerId");`);
    console.log('✓ Unique index Stock_product_dealerId_key ensured!');
  } catch (e: any) {
    console.log('Notice on Index:', e.message);
  }

  // Also check all tables in Turso
  const tables = await client.execute(`SELECT name, sql FROM sqlite_master WHERE type='table'`);
  console.log('All Turso tables:', tables.rows.map(r => r.name));
}

updateStockSchema().catch(console.error);
