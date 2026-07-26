import { createClient } from '@libsql/client';

const url = 'https://kuyumpanel-db-cenk5626.aws-us-east-1.turso.io';
const authToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQ5MzUzNjcsImlkIjoiMDE5Zjk2NDMtY2EwMS03MjE4LThkYmEtZGE4YjI1MTY3MjI2Iiwia2lkIjoiNWhmQnk2WTN1NkVDazNkLTd5c3BZc3JBRlRWYW1yVFh0emtVd2dCdGtGNCIsInJpZCI6ImUxNTM3NjllLWUxNWMtNDhkNi05MzMzLTlhYjQ0MjFiNTcwOCJ9.grKQ1ZymXrHb9DWwiJ_uP7y7dZyDu5pO4e8Hem-aUB4h6jr7OIJ19FqUpJkqssm5Wdm4wm3nHR32j9inJJ3ZDA';

const client = createClient({ url, authToken });

async function seedLivePrices() {
  console.log('LivePrice tablosu dolduruluyor...');

  const initialPrices = [
    { id: 'GAUTRY', label: 'Has Altın', bid: 6150, ask: 6175 },
    { id: 'USDTRY', label: 'Amerikan Doları (USD)', bid: 36.45, ask: 36.55 },
    { id: 'EURTRY', label: 'Euro (EUR)', bid: 38.10, ask: 38.25 },
    { id: 'ECEYREKTL', label: 'Çeyrek Altın', bid: 9870, ask: 9910 },
    { id: 'EYARIMTL', label: 'Yarım Altın', bid: 19740, ask: 19820 },
    { id: 'ETAMTL', label: 'Tam Altın', bid: 39480, ask: 39640 },
    { id: 'EATATL', label: 'Ata Altın', bid: 43100, ask: 43250 },
    { id: 'EGREMSETL', label: 'Gremse', bid: 98700, ask: 99100 },
    { id: 'mil24Ayar', label: '24 Ayar Gram', bid: 6150, ask: 6175 },
    { id: 'mil22Ayar', label: '22 Ayar Gram', bid: 5633, ask: 5656 },
    { id: 'milAdanaBurma', label: 'Adana-Burma Bilezik', bid: 5725, ask: 5748 },
    { id: 'milAjda', label: 'Ajda Bilezik', bid: 5793, ask: 5816 },
    { id: 'mil14Ayar', label: '14 Ayar Gram', bid: 3585, ask: 3600 },
  ];

  for (const item of initialPrices) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO "LivePrice" ("id", "label", "bid", "ask", "updatedAt") 
            VALUES (?, ?, ?, ?, datetime('now'))`,
      args: [item.id, item.label, item.bid, item.ask],
    });
  }

  console.log('✓ LivePrice tablosu dolduruldu!');
}

seedLivePrices().catch(console.error);
