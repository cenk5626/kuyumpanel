const { createClient } = require('@libsql/client');

const TURSO_URL = 'libsql://kuyumpanel-db-cenk5626.aws-us-east-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQ5MzUzNjcsImlkIjoiMDE5Zjk2NDMtY2EwMS03MjE4LThkYmEtZGE4YjI1MTY3MjI2Iiwia2lkIjoiNWhmQnk2WTN1NkVDazNkLTd5c3BZc3JBRlRWYW1yVFh0emtVd2dCdGtGNCIsInJpZCI6ImUxNTM3NjllLWUxNWMtNDhkNi05MzMzLTlhYjQ0MjFiNTcwOCJ9.grKQ1ZymXrHb9DWwiJ_uP7y7dZyDu5pO4e8Hem-aUB4h6jr7OIJ19FqUpJkqssm5Wdm4wm3nHR32j9inJJ3ZDA';

async function checkAllTables() {
  const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  
  const tables = ['Customer', 'Supplier', 'ProductItem', 'Stock', 'Dealer', 'User', 'PriceSettings', 'HasPrice', 'ZiynetPrice', 'LivePrice', 'Category', 'SubCategory', 'SubSubCategory', 'Employee', 'AuditLog', 'CustomerTransaction', 'SupplierTransaction', 'TransactionRevisionLog', 'PriceAlert', 'StockAuditSession', 'CashRegisterSession', 'CashMovement'];

  for (const table of tables) {
    try {
      const res = await client.execute(`PRAGMA table_info("${table}");`);
      console.log(`Table ${table} columns:`, res.rows.map(r => r.name));
    } catch (e) {
      console.log(`Table ${table} error:`, e.message);
    }
  }
}

checkAllTables().catch(console.error);
