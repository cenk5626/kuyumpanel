import { createClient } from '@libsql/client';

const url = 'https://kuyumpanel-db-cenk5626.aws-us-east-1.turso.io';
const authToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQ5MzUzNjcsImlkIjoiMDE5Zjk2NDMtY2EwMS03MjE4LThkYmEtZGE4YjI1MTY3MjI2Iiwia2lkIjoiNWhmQnk2WTN1NkVDazNkLTd5c3BZc3JBRlRWYW1yVFh0emtVd2dCdGtGNCIsInJpZCI6ImUxNTM3NjllLWUxNWMtNDhkNi05MzMzLTlhYjQ0MjFiNTcwOCJ9.grKQ1ZymXrHb9DWwiJ_uP7y7dZyDu5pO4e8Hem-aUB4h6jr7OIJ19FqUpJkqssm5Wdm4wm3nHR32j9inJJ3ZDA';

const client = createClient({ url, authToken });

async function fixMerkezDealer() {
  console.log('Merkez bayi ve stok kontrol ediliyor...');

  // 1. Merkez dealer var mı ekle
  await client.execute({
    sql: `INSERT OR IGNORE INTO "Dealer" ("id", "name", "createdAt", "updatedAt") VALUES (?, ?, datetime('now'), datetime('now'))`,
    args: ['merkez', 'Merkez Mağaza'],
  });
  console.log('✓ Merkez Dealer kontrol edildi/eklendi.');

  // 2. Admin kullanıcısına dealerId = 'merkez' güncelle
  await client.execute({
    sql: `UPDATE "User" SET "dealerId" = 'merkez' WHERE "email" = 'admin@kuyumpanel.com'`,
    args: [],
  });
  console.log('✓ Admin kullanıcısı dealerId=merkez olarak güncellendi.');

  console.log('İşlem tamam!');
}

fixMerkezDealer().catch(console.error);
