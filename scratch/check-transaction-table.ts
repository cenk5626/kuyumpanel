import { createClient } from '@libsql/client';

const TURSO_URL = 'libsql://kuyumpanel-db-cenk5626.aws-us-east-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQ5MzUzNjcsImlkIjoiMDE5Zjk2NDMtY2EwMS03MjE4LThkYmEtZGE4YjI1MTY3MjI2Iiwia2lkIjoiNWhmQnk2WTN1NkVDazNkLTd5c3BZc3JBRlRWYW1yVFh0emtVd2dCdGtGNCIsInJpZCI6ImUxNTM3NjllLWUxNWMtNDhkNi05MzMzLTlhYjQ0MjFiNTcwOCJ9.grKQ1ZymXrHb9DWwiJ_uP7y7dZyDu5pO4e8Hem-aUB4h6jr7OIJ19FqUpJkqssm5Wdm4wm3nHR32j9inJJ3ZDA';

async function checkTxTable() {
  const client = createClient({
    url: TURSO_URL,
    authToken: TURSO_TOKEN,
  });

  const schemaInfo = await client.execute(`SELECT sql FROM sqlite_master WHERE type='table' AND name='Transaction'`);
  console.log('Transaction Table SQL on Turso:', schemaInfo.rows[0]?.sql);

  const cashMovements = await client.execute(`SELECT sql FROM sqlite_master WHERE type='table' AND name='CashMovement'`);
  console.log('CashMovement Table SQL on Turso:', cashMovements.rows[0]?.sql);

  const cashSession = await client.execute(`SELECT sql FROM sqlite_master WHERE type='table' AND name='CashRegisterSession'`);
  console.log('CashRegisterSession Table SQL on Turso:', cashSession.rows[0]?.sql);
}

checkTxTable().catch(console.error);
