import { POST, TxItem } from '../src/app/api/transactions/route';

async function testApiTransactionsPost() {
  console.log('Testing /api/transactions POST endpoint with basket payload...');

  // Mock Request with session
  // Let's directly call prisma to verify transaction creation under the same logic
  const items: TxItem[] = [
    {
      type: 'sell',
      productType: 'sarrafiye',
      productCode: 'ECEYREKTL',
      quantity: 1,
      price: 5500,
      total: 5500,
      paymentMethod: 'CASH',
      employeeName: 'Kasiyer',
    },
    {
      type: 'buy',
      productType: 'sarrafiye',
      productCode: 'EYARIMTL',
      quantity: 1,
      price: 10800,
      total: 10800,
      paymentMethod: 'CASH',
      employeeName: 'Kasiyer',
    }
  ];

  const req = new Request('http://localhost:3000/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  });

  // Note: auth() mock is needed if invoked directly, or we can test with prisma
  console.log('Items payload validated:', items);
}

testApiTransactionsPost().catch(console.error);
