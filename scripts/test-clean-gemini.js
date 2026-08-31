const { createClient } = require('@libsql/client');

const TURSO_URL = 'libsql://kuyumpanel-db-cenk5626.aws-us-east-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQ5MzUzNjcsImlkIjoiMDE5Zjk2NDMtY2EwMS03MjE4LThkYmEtZGE4YjI1MTY3MjI2Iiwia2lkIjoiNWhmQnk2WTN1NkVDazNkLTd5c3BZc3JBRlRWYW1yVFh0emtVd2dCdGtGNCIsInJpZCI6ImUxNTM3NjllLWUxNWMtNDhkNi05MzMzLTlhYjQ0MjFiNTcwOCJ9.grKQ1ZymXrHb9DWwiJ_uP7y7dZyDu5pO4e8Hem-aUB4h6jr7OIJ19FqUpJkqssm5Wdm4wm3nHR32j9inJJ3ZDA';

async function testCleanGemini() {
  const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  const res = await client.execute("SELECT geminiApiKey, aiModel FROM Dealer WHERE id = 'merkez';");
  const apiKey = res.rows[0].geminiApiKey;
  const model = res.rows[0].aiModel;

  console.log('Testing clean Gemini with system_instruction...');
  const start = Date.now();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: 'Sen Kapalıçarşı tecrübeli kuyumcu danışmanısın. Mağazada 121 gr altın var.' }]
      },
      contents: [
        { role: 'user', parts: [{ text: 'Selam patron nasılsın?' }] }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    })
  });

  const duration = Date.now() - start;
  console.log(`Response received in ${duration}ms! Status:`, response.status);
  const data = await response.json();
  console.log('AI Answer:', data.candidates?.[0]?.content?.parts?.[0]?.text);
}

testCleanGemini().catch(console.error);
