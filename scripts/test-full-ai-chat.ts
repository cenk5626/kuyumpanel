import { generateAiResponse } from '../src/lib/ai-engine';

async function testChat() {
  console.log('Testing full generateAiResponse with dealer "merkez"...');
  const start = Date.now();
  const answer = await generateAiResponse('merkez', [
    { role: 'user', content: 'Selam patron, dükkanda durumlar nasıl?' }
  ]);
  const duration = Date.now() - start;
  console.log(`\n👑 AI Chat Success in ${duration}ms!`);
  console.log('--------------------------------------------------');
  console.log(answer);
  console.log('--------------------------------------------------');
}

testChat().catch(console.error);
