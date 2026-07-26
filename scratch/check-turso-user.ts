import { createClient } from '@libsql/client';
import { compare } from 'bcryptjs';

const url = 'https://kuyumpanel-db-cenk5626.aws-us-east-1.turso.io';
const authToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQ5MzUzNjcsImlkIjoiMDE5Zjk2NDMtY2EwMS03MjE4LThkYmEtZGE4YjI1MTY3MjI2Iiwia2lkIjoiNWhmQnk2WTN1NkVDazNkLTd5c3BZc3JBRlRWYW1yVFh0emtVd2dCdGtGNCIsInJpZCI6ImUxNTM3NjllLWUxNWMtNDhkNi05MzMzLTlhYjQ0MjFiNTcwOCJ9.grKQ1ZymXrHb9DWwiJ_uP7y7dZyDu5pO4e8Hem-aUB4h6jr7OIJ19FqUpJkqssm5Wdm4wm3nHR32j9inJJ3ZDA';

const client = createClient({ url, authToken });

async function check() {
  const res = await client.execute({
    sql: 'SELECT * FROM "User" WHERE "email" = ?',
    args: ['admin@kuyumpanel.com'],
  });

  console.log('Bulunan Kullanıcı Sayısı:', res.rows.length);
  if (res.rows.length > 0) {
    const u = res.rows[0];
    console.log('E-posta:', u.email);
    console.log('Rol:', u.role);
    const pass = String(u.password);
    const match = await compare('admin123', pass);
    console.log('Şifre admin123 ile eşleşiyor mu?:', match);
  }
}

check().catch(console.error);
