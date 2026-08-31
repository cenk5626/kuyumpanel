const { createClient } = require('@libsql/client');

const TURSO_URL = 'libsql://kuyumpanel-db-cenk5626.aws-us-east-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQ5MzUzNjcsImlkIjoiMDE5Zjk2NDMtY2EwMS03MjE4LThkYmEtZGE4YjI1MTY3MjI2Iiwia2lkIjoiNWhmQnk2WTN1NkVDazNkLTd5c3BZc3JBRlRWYW1yVFh0emtVd2dCdGtGNCIsInJpZCI6ImUxNTM3NjllLWUxNWMtNDhkNi05MzMzLTlhYjQ0MjFiNTcwOCJ9.grKQ1ZymXrHb9DWwiJ_uP7y7dZyDu5pO4e8Hem-aUB4h6jr7OIJ19FqUpJkqssm5Wdm4wm3nHR32j9inJJ3ZDA';

async function checkTx() {
  const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  const res = await client.execute('PRAGMA table_info("Transaction");');
  const existingCols = res.rows.map(r => r.name);
  console.log('Transaction columns on Turso:', existingCols);

  const txCols = [
    { name: 'hasEquivalent', type: 'REAL DEFAULT 0' },
    { name: 'orderNote', type: 'TEXT' },
    { name: 'employeeName', type: 'TEXT' },
    { name: 'customerId', type: 'TEXT' },
    { name: 'sessionId', type: 'TEXT' },
    { name: 'cardFeePercent', type: 'REAL' },
    { name: 'profitAmount', type: 'REAL' },
    { name: 'profitMargin', type: 'REAL' },
    { name: 'costPrice', type: 'REAL' }
  ];

  for (const col of txCols) {
    if (!existingCols.includes(col.name)) {
      console.log(`Adding ${col.name} to "Transaction"...`);
      await client.execute(`ALTER TABLE "Transaction" ADD COLUMN ${col.name} ${col.type};`);
      console.log(`✓ Added ${col.name}`);
    }
  }

  // Also test ProductItem findMany to verify the exact query that failed for the user
  console.log('Testing ProductItem query on Turso...');
  const items = await client.execute('SELECT id, barcode, title, isDiamond, quantity, weight FROM ProductItem LIMIT 5;');
  console.log('ProductItem query success! Rows count:', items.rows.length);
}

checkTx().catch(console.error);
