const { createClient } = require('@libsql/client');

const TURSO_URL = 'libsql://kuyumpanel-db-cenk5626.aws-us-east-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQ5MzUzNjcsImlkIjoiMDE5Zjk2NDMtY2EwMS03MjE4LThkYmEtZGE4YjI1MTY3MjI2Iiwia2lkIjoiNWhmQnk2WTN1NkVDazNkLTd5c3BZc3JBRlRWYW1yVFh0emtVd2dCdGtGNCIsInJpZCI6ImUxNTM3NjllLWUxNWMtNDhkNi05MzMzLTlhYjQ0MjFiNTcwOCJ9.grKQ1ZymXrHb9DWwiJ_uP7y7dZyDu5pO4e8Hem-aUB4h6jr7OIJ19FqUpJkqssm5Wdm4wm3nHR32j9inJJ3ZDA';

async function testFastModels() {
  const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  const res = await client.execute("SELECT geminiApiKey FROM Dealer WHERE id = 'merkez';");
  const apiKey = res.rows[0].geminiApiKey;

  const testList = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-pro', 'gemini-3.5-flash'];

  for (const m of testList) {
    const start = Date.now();
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: 'Sen Kapalıçarşı tecrübeli kuyumcu danışmanısın. Mağazada 121 gr altın var.' }]
          },
          contents: [
            { role: 'user', parts: [{ text: 'Selam' }] }
          ]
        })
      });
      const duration = Date.now() - start;
      const data = await response.json();
      console.log(`[${m}] Status: ${response.status} in ${duration}ms! Answer:`, data.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 100));
    } catch (e) {
      console.log(`[${m}] Error:`, e.message);
    }
  }
}

testFastModels().catch(console.error);
