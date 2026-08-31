const { createClient } = require('@libsql/client');

const TURSO_URL = 'libsql://kuyumpanel-db-cenk5626.aws-us-east-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQ5MzUzNjcsImlkIjoiMDE5Zjk2NDMtY2EwMS03MjE4LThkYmEtZGE4YjI1MTY3MjI2Iiwia2lkIjoiNWhmQnk2WTN1NkVDazNkLTd5c3BZc3JBRlRWYW1yVFh0emtVd2dCdGtGNCIsInJpZCI6ImUxNTM3NjllLWUxNWMtNDhkNi05MzMzLTlhYjQ0MjFiNTcwOCJ9.grKQ1ZymXrHb9DWwiJ_uP7y7dZyDu5pO4e8Hem-aUB4h6jr7OIJ19FqUpJkqssm5Wdm4wm3nHR32j9inJJ3ZDA';

async function addMissingCustomerCols() {
  const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  
  console.log('Adding hasBalance and tlBalance to Customer table...');
  try {
    await client.execute('ALTER TABLE Customer ADD COLUMN hasBalance REAL DEFAULT 0;');
    console.log('✓ Added hasBalance to Customer');
  } catch (e) {
    console.log('hasBalance note:', e.message);
  }

  try {
    await client.execute('ALTER TABLE Customer ADD COLUMN tlBalance REAL DEFAULT 0;');
    console.log('✓ Added tlBalance to Customer');
  } catch (e) {
    console.log('tlBalance note:', e.message);
  }

  // Verify Customer table
  const res = await client.execute('PRAGMA table_info(Customer);');
  console.log('Updated Customer columns:', res.rows.map(r => r.name));
}

addMissingCustomerCols().catch(console.error);
