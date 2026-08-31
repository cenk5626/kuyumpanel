const { createClient } = require('@libsql/client');
const { PrismaClient } = require('@prisma/client');

const TURSO_URL = 'libsql://kuyumpanel-db-cenk5626.aws-us-east-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQ5MzUzNjcsImlkIjoiMDE5Zjk2NDMtY2EwMS03MjE4LThkYmEtZGE4YjI1MTY3MjI2Iiwia2lkIjoiNWhmQnk2WTN1NkVDazNkLTd5c3BZc3JBRlRWYW1yVFh0emtVd2dCdGtGNCIsInJpZCI6ImUxNTM3NjllLWUxNWMtNDhkNi05MzMzLTlhYjQ0MjFiNTcwOCJ9.grKQ1ZymXrHb9DWwiJ_uP7y7dZyDu5pO4e8Hem-aUB4h6jr7OIJ19FqUpJkqssm5Wdm4wm3nHR32j9inJJ3ZDA';

async function syncLocalFromTurso() {
  const tursoClient = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  const localPrisma = new PrismaClient();

  const res = await tursoClient.execute("SELECT * FROM Dealer WHERE id = 'merkez';");
  if (res.rows.length > 0) {
    const d = res.rows[0];
    console.log('Turso dealer data found:', d.name, 'API Key length:', d.geminiApiKey ? d.geminiApiKey.length : 0);
    
    await localPrisma.dealer.upsert({
      where: { id: 'merkez' },
      update: {
        aiProvider: d.aiProvider || 'GEMINI',
        geminiApiKey: d.geminiApiKey || null,
        openaiApiKey: d.openaiApiKey || null,
        aiModel: d.aiModel || 'gemini-3.5-flash',
        aiSystemPromptExtra: d.aiSystemPromptExtra || null,
        whatsappProvider: d.whatsappProvider || 'WEB_INTENT',
        whatsappPhone: d.whatsappPhone || null,
        waGatewayInstanceId: d.waGatewayInstanceId || null,
        waGatewayToken: d.waGatewayToken || null,
      },
      create: {
        id: 'merkez',
        name: d.name || 'Merkez Mağaza',
        aiProvider: d.aiProvider || 'GEMINI',
        geminiApiKey: d.geminiApiKey || null,
        openaiApiKey: d.openaiApiKey || null,
        aiModel: d.aiModel || 'gemini-3.5-flash',
        aiSystemPromptExtra: d.aiSystemPromptExtra || null,
        whatsappProvider: d.whatsappProvider || 'WEB_INTENT',
        whatsappPhone: d.whatsappPhone || null,
      }
    });
    console.log('✓ Local dev.db Dealer record synchronized with Turso!');
  }
}

syncLocalFromTurso().catch(console.error);
