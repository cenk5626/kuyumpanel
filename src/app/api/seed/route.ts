import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';

const SALT_ROUNDS = 12;

const CREATE_TABLES_SQL = [
  `CREATE TABLE IF NOT EXISTS "Dealer" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "name" TEXT UNIQUE NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT UNIQUE NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "permissions" TEXT DEFAULT '["dashboard","prices","stocks","transactions","suppliers","customers","logs","price-check","users"]',
    "dealerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("dealerId") REFERENCES "Dealer" ("id") ON DELETE CASCADE
  );`,

  `CREATE TABLE IF NOT EXISTS "HasPrice" (
    "id" TEXT PRIMARY KEY NOT NULL DEFAULT 'singleton',
    "bid" REAL NOT NULL,
    "ask" REAL NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'altis',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE TABLE IF NOT EXISTS "ZiynetPrice" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "bid" REAL NOT NULL,
    "ask" REAL NOT NULL,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE TABLE IF NOT EXISTS "PriceSettings" (
    "id" TEXT PRIMARY KEY NOT NULL DEFAULT 'singleton',
    "sourceOrder" TEXT NOT NULL DEFAULT '["altis","harem"]',
    "priceOffsets" TEXT NOT NULL DEFAULT '{}',
    "mil24Ayar" REAL NOT NULL DEFAULT 1000,
    "mil22Ayar" REAL NOT NULL DEFAULT 916,
    "milAdanaBurma" REAL NOT NULL DEFAULT 931,
    "milAjda" REAL NOT NULL DEFAULT 942,
    "mil14Ayar" REAL NOT NULL DEFAULT 583,
    "gremseMil" REAL NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE TABLE IF NOT EXISTS "Stock" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "product" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL DEFAULT 0,
    "dealerId" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("dealerId") REFERENCES "Dealer" ("id") ON DELETE CASCADE
  );`,

  `CREATE TABLE IF NOT EXISTS "Transaction" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "dealerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "price" REAL NOT NULL,
    "total" REAL NOT NULL,
    "employeeName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("dealerId") REFERENCES "Dealer" ("id") ON DELETE CASCADE
  );`,

  `CREATE TABLE IF NOT EXISTS "Employee" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "name" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("dealerId") REFERENCES "Dealer" ("id") ON DELETE CASCADE
  );`,

  `CREATE TABLE IF NOT EXISTS "LivePrice" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "label" TEXT NOT NULL,
    "bid" REAL NOT NULL,
    "ask" REAL NOT NULL,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE TABLE IF NOT EXISTS "ProductItem" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "barcode" TEXT UNIQUE NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "category" TEXT,
    "subType" TEXT,
    "subSubType" TEXT,
    "carat" INTEGER NOT NULL,
    "weight" REAL NOT NULL,
    "size" TEXT,
    "costMilyem" REAL NOT NULL,
    "laborMilyem" REAL NOT NULL,
    "sellingMilyem" REAL,
    "profitMargin" REAL NOT NULL,
    "costPrice" REAL,
    "laborType" TEXT NOT NULL DEFAULT 'milyem',
    "laborCost" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "supplierName" TEXT,
    "dealerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("dealerId") REFERENCES "Dealer" ("id") ON DELETE CASCADE
  );`,

  `CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("dealerId") REFERENCES "Dealer" ("id") ON DELETE CASCADE
  );`,

  `CREATE TABLE IF NOT EXISTS "SubCategory" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE
  );`,

  `CREATE TABLE IF NOT EXISTS "SubSubCategory" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "name" TEXT NOT NULL,
    "subCategoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("subCategoryId") REFERENCES "SubCategory" ("id") ON DELETE CASCADE
  );`,

  `CREATE TABLE IF NOT EXISTS "Supplier" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "note" TEXT,
    "hasBalance" REAL NOT NULL DEFAULT 0,
    "tlBalance" REAL NOT NULL DEFAULT 0,
    "dealerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("dealerId") REFERENCES "Dealer" ("id") ON DELETE CASCADE
  );`,

  `CREATE TABLE IF NOT EXISTS "SupplierTransaction" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "supplierId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "hasAmount" REAL NOT NULL DEFAULT 0,
    "tlAmount" REAL NOT NULL DEFAULT 0,
    "unitPrice" REAL,
    "documentNo" TEXT,
    "description" TEXT,
    "employeeName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE CASCADE
  );`,

  `CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "dealerId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "userEmail" TEXT,
    "userName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("dealerId") REFERENCES "Dealer" ("id") ON DELETE CASCADE
  );`,

  `CREATE TABLE IF NOT EXISTS "Customer" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "tcNo" TEXT,
    "address" TEXT,
    "note" TEXT,
    "dealerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("dealerId") REFERENCES "Dealer" ("id") ON DELETE CASCADE
  );`,

  `CREATE TABLE IF NOT EXISTS "CustomerTransaction" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "customerId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "hasEquivalent" REAL NOT NULL DEFAULT 0,
    "unitPrice" REAL,
    "description" TEXT,
    "employeeName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE
  );`
];

/**
 * GET /api/seed — Veritabanı tablolarını eksiksiz oluşturur ve Super Admin ekler
 */
export async function GET() {
  try {
    // 1. Tüm veritabanı tablolarını otomatik oluştur
    for (const sql of CREATE_TABLES_SQL) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (e) {
        // Tablo zaten mevcut olabilir
      }
    }

    // 1.5. Merkez bayi kaydını garanti et
    try {
      await prisma.$executeRawUnsafe(
        `INSERT OR IGNORE INTO "Dealer" ("id", "name", "createdAt", "updatedAt") VALUES ('merkez', 'Merkez Mağaza', datetime('now'), datetime('now'))`
      );
    } catch (e) {}

    const email = 'admin@kuyumpanel.com';
    const password = 'admin123';

    // 2. Admin kullanıcısını kontrol et veya ekle
    const existingAdmin = await prisma.user.findUnique({
      where: { email },
    });

    if (!existingAdmin) {
      const hashedPassword = await hash(password, SALT_ROUNDS);
      const user = await prisma.user.create({
        data: {
          id: 'admin-seed-id',
          name: 'Super Admin',
          email,
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          permissions: '["dashboard","prices","stocks","transactions","suppliers","customers","logs","price-check","users"]',
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Veritabanı tabloları oluşturuldu ve Super Admin başarıyla eklendi!',
        user: { email: user.email, role: user.role },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Super Admin kullanıcısı veritabanında zaten mevcut.',
      user: { email: existingAdmin.email, role: existingAdmin.role },
    });
  } catch (error: any) {
    console.error('[API Seed Error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
