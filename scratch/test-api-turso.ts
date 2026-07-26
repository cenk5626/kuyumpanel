import { createClient } from '@libsql/client';

const url = 'https://kuyumpanel-db-cenk5626.aws-us-east-1.turso.io';
const authToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQ5MzUzNjcsImlkIjoiMDE5Zjk2NDMtY2EwMS03MjE4LThkYmEtZGE4YjI1MTY3MjI2Iiwia2lkIjoiNWhmQnk2WTN1NkVDazNkLTd5c3BZc3JBRlRWYW1yVFh0emtVd2dCdGtGNCIsInJpZCI6ImUxNTM3NjllLWUxNWMtNDhkNi05MzMzLTlhYjQ0MjFiNTcwOCJ9.grKQ1ZymXrHb9DWwiJ_uP7y7dZyDu5pO4e8Hem-aUB4h6jr7OIJ19FqUpJkqssm5Wdm4wm3nHR32j9inJJ3ZDA';

const client = createClient({ url, authToken });

async function testAll() {
  console.log('--- TURSO DATABASE TEST ---');

  const stocks = await client.execute('SELECT * FROM "Stock"');
  console.log('Stock tablosundaki satır sayısı:', stocks.rows.length);

  const dealers = await client.execute('SELECT * FROM "Dealer"');
  console.log('Dealer tablosundaki satır sayısı:', dealers.rows.length);

  const settings = await client.execute('SELECT * FROM "PriceSettings"');
  console.log('PriceSettings tablosundaki satır sayısı:', settings.rows.length);

  const live = await client.execute('SELECT * FROM "LivePrice"');
  console.log('LivePrice tablosundaki satır sayısı:', live.rows.length);

  const users = await client.execute('SELECT email, dealerId, role FROM "User"');
  console.log('Users:', users.rows);
}

testAll().catch(console.error);
