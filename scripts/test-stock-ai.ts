import { generateAiResponse } from '../src/lib/ai-engine';

async function testStockAI() {
  console.log('Testing Stock update prompt with AI...');
  const answer = await generateAiResponse('merkez', [
    { role: 'user', content: 'Çeyrek altın stoğumu 20 adet olarak güncelle.' }
  ]);
  console.log('\n--- AI Response ---');
  console.log(answer);
  console.log('-------------------');
}

testStockAI().catch(console.error);
