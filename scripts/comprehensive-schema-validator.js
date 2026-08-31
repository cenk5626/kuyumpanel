const fs = require('fs');
const { createClient } = require('@libsql/client');

const TURSO_URL = 'libsql://kuyumpanel-db-cenk5626.aws-us-east-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQ5MzUzNjcsImlkIjoiMDE5Zjk2NDMtY2EwMS03MjE4LThkYmEtZGE4YjI1MTY3MjI2Iiwia2lkIjoiNWhmQnk2WTN1NkVDazNkLTd5c3BZc3JBRlRWYW1yVFh0emtVd2dCdGtGNCIsInJpZCI6ImUxNTM3NjllLWUxNWMtNDhkNi05MzMzLTlhYjQ0MjFiNTcwOCJ9.grKQ1ZymXrHb9DWwiJ_uP7y7dZyDu5pO4e8Hem-aUB4h6jr7OIJ19FqUpJkqssm5Wdm4wm3nHR32j9inJJ3ZDA';

async function validateAndSyncAll() {
  const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  const schemaContent = fs.readFileSync('prisma/schema.prisma', 'utf8');

  // Parse models from prisma schema
  const modelRegex = /model\s+(\w+)\s+{([^}]+)}/g;
  let match;
  const prismaModels = {};

  while ((match = modelRegex.exec(schemaContent)) !== null) {
    const modelName = match[1];
    const body = match[2];
    const fields = [];

    const lines = body.split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('//') || line.startsWith('@@')) continue;

      const tokens = line.split(/\s+/);
      const fieldName = tokens[0];
      const fieldType = tokens[1];

      // Ignore relational fields (where fieldType starts with Uppercase or has brackets, unless it's a known scalar)
      const isScalar = ['String', 'String?', 'Int', 'Int?', 'Float', 'Float?', 'Boolean', 'Boolean?', 'DateTime', 'DateTime?'].includes(fieldType);
      if (isScalar) {
        let sqlType = 'TEXT';
        let defaultClause = '';
        if (fieldType.startsWith('Int')) sqlType = 'INTEGER';
        if (fieldType.startsWith('Float')) sqlType = 'REAL';
        if (fieldType.startsWith('Boolean')) sqlType = 'INTEGER';
        if (fieldType.startsWith('DateTime')) sqlType = 'DATETIME';

        if (line.includes('@default(')) {
          const defaultVal = line.match(/@default\(([^)]+)\)/)?.[1];
          if (defaultVal) {
            defaultClause = `DEFAULT ${defaultVal}`;
          }
        }

        fields.push({ fieldName, sqlType, defaultClause });
      }
    }
    prismaModels[modelName] = fields;
  }

  console.log(`Parsed ${Object.keys(prismaModels).length} models from schema.prisma.`);

  // Check each model against Turso
  for (const [modelName, fields] of Object.entries(prismaModels)) {
    try {
      const res = await client.execute(`PRAGMA table_info("${modelName}");`);
      const existingCols = res.rows.map(r => r.name);

      for (const field of fields) {
        if (!existingCols.includes(field.fieldName)) {
          console.log(`[TURSO MISSING] ${modelName}.${field.fieldName} -> Adding column...`);
          try {
            const alterSql = `ALTER TABLE "${modelName}" ADD COLUMN "${field.fieldName}" ${field.sqlType} ${field.defaultClause};`;
            await client.execute(alterSql);
            console.log(`✓ Added ${modelName}.${field.fieldName}`);
          } catch (alterErr) {
            console.error(`✕ Failed to add ${modelName}.${field.fieldName}: ${alterErr.message}`);
          }
        }
      }
    } catch (tblErr) {
      console.log(`Table ${modelName} inspection error:`, tblErr.message);
    }
  }

  console.log('=== COMPREHENSIVE SCHEMA VALIDATION & SYNC COMPLETED ===');
}

validateAndSyncAll().catch(console.error);
