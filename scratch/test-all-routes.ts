import { prisma } from '@/lib/prisma';

async function testAllRoutesAndDb() {
  console.log('--- 1. Testing Database Tables & Models ---');
  
  try {
    const userCount = await prisma.user.count();
    console.log('✓ User table count:', userCount);
  } catch (e: any) {
    console.error('❌ User table error:', e.message);
  }

  try {
    const dealerCount = await prisma.dealer.count();
    console.log('✓ Dealer table count:', dealerCount);
  } catch (e: any) {
    console.error('❌ Dealer table error:', e.message);
  }

  try {
    const stockCount = await prisma.stock.count();
    console.log('✓ Stock table count:', stockCount);
  } catch (e: any) {
    console.error('❌ Stock table error:', e.message);
  }

  try {
    const custCount = await prisma.customer.count();
    console.log('✓ Customer table count:', custCount);
  } catch (e: any) {
    console.error('❌ Customer table error:', e.message);
  }

  try {
    const suppCount = await prisma.supplier.count();
    console.log('✓ Supplier table count:', suppCount);
  } catch (e: any) {
    console.error('❌ Supplier table error:', e.message);
  }

  try {
    const txCount = await prisma.transaction.count();
    console.log('✓ Transaction table count:', txCount);
  } catch (e: any) {
    console.error('❌ Transaction table error:', e.message);
  }

  try {
    const liveCount = await prisma.livePrice.count();
    console.log('✓ LivePrice table count:', liveCount);
  } catch (e: any) {
    console.error('❌ LivePrice table error:', e.message);
  }

  try {
    const sessCount = await prisma.cashRegisterSession.count();
    console.log('✓ CashRegisterSession table count:', sessCount);
  } catch (e: any) {
    console.error('❌ CashRegisterSession table error:', e.message);
  }

  try {
    const movCount = await prisma.cashMovement.count();
    console.log('✓ CashMovement table count:', movCount);
  } catch (e: any) {
    console.error('❌ CashMovement table error:', e.message);
  }

  console.log('--- 2. Checking Prisma Schema Synchronization on Turso ---');
}

testAllRoutesAndDb().catch(console.error);
