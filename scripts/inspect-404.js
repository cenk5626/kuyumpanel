const { createClient } = require('@libsql/client');

const TURSO_URL = 'libsql://kuyumpanel-db-cenk5626.aws-us-east-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQ5MzUzNjcsImlkIjoiMDE5Zjk2NDMtY2EwMS03MjE4LThkYmEtZGE4YjI1MTY3MjI2Iiwia2lkIjoiNWhmQnk2WTN1NkVDazNkLTd5c3BZc3JBRlRWYW1yVFh0emtVd2dCdGtGNCIsInJpZCI6ImUxNTM3NjllLWUxNWMtNDhkNi05MzMzLTlhYjQ0MjFiNTcwOCJ9.grKQ1ZymXrHb9DWwiJ_uP7y7dZyDu5pO4e8Hem-aUB4h6jr7OIJ19FqUpJkqssm5Wdm4wm3nHR32j9inJJ3ZDA';

async function check404() {
  const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  const res = await client.execute("SELECT geminiApiKey FROM Dealer WHERE id = 'merkez';");
  const apiKey = res.rows[0].geminiApiKey;

  // Let's query Google's listModels endpoint to see what models this API key has access to!
  const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const response = await fetch(listUrl);
  console.log('List models status:', response.status);
  const data = await response.json();
  if (data.models) {
    console.log('Available models for this API key:');
    data.models.forEach(m => console.log(' - ' + m.name.replace('models/', '')));
  } else {
    console.log('Error listing models:', data);
  }
}

check404().catch(console.error);
