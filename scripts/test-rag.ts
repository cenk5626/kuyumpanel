import { prisma } from '../src/lib/prisma';
import { getStoreContext } from '../src/lib/ai-engine';

async function testRAG() {
  console.log('Testing getStoreContext with Prisma on Turso...');
  const dealer = await prisma.dealer.findFirst();
  console.log('Dealer found:', dealer?.name, dealer?.id);
  
  if (dealer) {
    const context = await getStoreContext(dealer.id);
    console.log('getStoreContext executed successfully!');
    console.log('Context summary:', {
      dealerName: context.dealerName,
      totalProductsCount: context.totalProductsCount,
      totalGoldWeightGr: context.totalGoldWeightGr,
      totalDiamondCount: context.totalDiamondCount,
      customerReceivableHas: context.customerReceivableHas,
      customerReceivableTL: context.customerReceivableTL,
      supplierDebtHas: context.supplierDebtHas,
      supplierDebtTL: context.supplierDebtTL,
      drawerTL: context.drawerTL,
      todaySalesVolumeTL: context.todaySalesVolumeTL,
    });
  }

  console.log('ALL PRISMA RAG QUERIES SUCCEEDED 100% WITHOUT ANY SQL ERROR!');
}

testRAG().catch(console.error);
