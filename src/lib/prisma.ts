import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const TURSO_FALLBACK_URL = 'libsql://kuyumpanel-db-cenk5626.aws-us-east-1.turso.io';
const TURSO_FALLBACK_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODQ5MzUzNjcsImlkIjoiMDE5Zjk2NDMtY2EwMS03MjE4LThkYmEtZGE4YjI1MTY3MjI2Iiwia2lkIjoiNWhmQnk2WTN1NkVDazNkLTd5c3BZc3JBRlRWYW1yVFh0emtVd2dCdGtGNCIsInJpZCI6ImUxNTM3NjllLWUxNWMtNDhkNi05MzMzLTlhYjQ0MjFiNTcwOCJ9.grKQ1ZymXrHb9DWwiJ_uP7y7dZyDu5pO4e8Hem-aUB4h6jr7OIJ19FqUpJkqssm5Wdm4wm3nHR32j9inJJ3ZDA';

const createPrismaInstance = () => {
  const tursoUrl =
    process.env.TURSO_DATABASE_URL ||
    process.env.TURSO_URL ||
    (process.env.DATABASE_URL?.startsWith('libsql://') || process.env.DATABASE_URL?.startsWith('https://')
      ? process.env.DATABASE_URL
      : undefined) ||
    (process.env.VERCEL || process.env.NODE_ENV === 'production' ? TURSO_FALLBACK_URL : undefined);

  const tursoToken =
    process.env.TURSO_AUTH_TOKEN ||
    process.env.TURSO_TOKEN ||
    process.env.DATABASE_AUTH_TOKEN ||
    (process.env.VERCEL || process.env.NODE_ENV === 'production' ? TURSO_FALLBACK_TOKEN : undefined);

  if (tursoUrl && tursoToken) {
    try {
      const libsql = createClient({
        url: tursoUrl,
        authToken: tursoToken,
      });
      const adapter = new PrismaLibSQL(libsql);
      return new PrismaClient({ adapter });
    } catch (err) {
      console.error('Failed to initialize LibSQL adapter, falling back to default PrismaClient:', err);
    }
  }

  return new PrismaClient();
};

export const prisma = globalForPrisma.prisma ?? createPrismaInstance();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
