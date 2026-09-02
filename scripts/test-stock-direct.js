const { createClient } = require('@libsql/client');
const { PrismaClient } = require('@prisma/client');

const TURSO_URL = 'libsql://kuyumpanel-db-cenk5626.aws-us-east-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQ5MzUzNjcsImlkIjoiMDE5Zjk2NDMtY2EwMS03MjE4LThkYmEtZGE4YjI1MTY3MjI2Iiwia2lkIjoiNWhmQnk2WTN1NkVDazNkLTd5c3BZc3JBRlRWYW1yVFh0emtVd2dCdGtGNCIsInJpZCI6ImUxNTM3NjllLWUxNWMtNDhkNi05MzMzLTlhYjQ0MjFiNTcwOCJ9.grKQ1ZymXrHb9DWwiJ_uP7y7dZyDu5pO4e8Hem-aUB4h6jr7OIJ19FqUpJkqssm5Wdm4wm3nHR32j9inJJ3ZDA';

async function testExecuteDirect() {
  const tursoClient = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  
  // Check current stock for ECEYREKTL on Turso
  const cur = await tursoClient.execute("SELECT * FROM Stock WHERE product = 'ECEYREKTL' AND dealerId = 'merkez';");
  console.log('Current Turso Stock for ECEYREKTL:', cur.rows);

  // Check all Stock rows
  const allStocks = await tursoClient.execute("SELECT product, label, amount, dealerId FROM Stock;");
  console.log('All Turso Stocks:', allStocks.rows);
}

testExecuteDirect().catch(console.error);
