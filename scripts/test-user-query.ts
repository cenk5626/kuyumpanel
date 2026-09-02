import { generateAiResponse } from '../src/lib/ai-engine';

async function testExactUserQuery() {
  console.log('Testing exact user prompt: "çeyrek stoğunu 20 olarak güncelle"');
  const res = await generateAiResponse('merkez', [
    { role: 'user', content: 'çeyrek stoğunu 20 olarak güncelle' }
  ]);
  console.log('=== RAW AI RESPONSE ===');
  console.log(res);
  console.log('========================');
}

testExactUserQuery().catch(console.error);
