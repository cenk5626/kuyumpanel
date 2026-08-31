/**
 * kuyumpanel Automated E2E & Multi-Tier Test Suite Orchestrator.
 * Executes all tests across Tiers 1-4 for 20 Features.
 * Usage: npx tsx tests/run-all-tests.ts
 */

import {
  clearRegistry,
  runRegisterededTests,
  TestResult,
  GlobalTestReport,
} from './helpers/test-utils';

// Tier 1 Registrars
import { registerF01Tests } from './tier1/f01_constants_enums.test';
import { registerF02Tests } from './tier1/f02_schema_integrity.test';
import { registerF03Tests } from './tier1/f03_dual_balance_ledger.test';
import { registerF04Tests } from './tier1/f04_gold_valuation_rates.test';
import { registerF05Tests } from './tier1/f05_customer_statement_running_balance.test';
import { registerF06Tests } from './tier1/f06_pos_multi_payment.test';
import { registerF07Tests } from './tier1/f07_cash_session_consolidation.test';
import { registerF08Tests } from './tier1/f08_zreport_reconciliation.test';
import { registerF09Tests } from './tier1/f09_thermal_slip_print.test';
import { registerF10Tests } from './tier1/f10_kelebek_label_layout.test';
import { registerF11Tests } from './tier1/f11_vector_zpl_generator.test';
import { registerF12Tests } from './tier1/f12_batch_label_modal.test';
import { registerF13Tests } from './tier1/f13_showcase_route_signage.test';
import { registerF14Tests } from './tier1/f14_promotional_ticker.test';
import { registerF15Tests } from './tier1/f15_pwa_manifest_sw.test';
import { registerF16Tests } from './tier1/f16_camera_barcode_scanner.test';
import { registerF17Tests } from './tier1/f17_whatsapp_share_builder.test';
import { registerF18Tests } from './tier1/f18_turnover_velocity_analytics.test';
import { registerF19Tests } from './tier1/f19_critical_stock_reorder_draft.test';
import { registerF20Tests } from './tier1/f20_e2e_verification_harness.test';
import { registerF21EnterpriseTests } from './tier1/f21_enterprise_modules.test';

// Tier 2 Registrars
import { registerTier2Part1Tests } from './tier2/tier2_boundaries_p1.test';
import { registerTier2Part2Tests } from './tier2/tier2_boundaries_p2.test';
import { registerTier2Part3Tests } from './tier2/tier2_boundaries_p3.test';
import { registerTier2Part4Tests } from './tier2/tier2_boundaries_p4.test';

// Tier 3 Registrar
import { registerTier3Tests } from './tier3/tier3_cross_feature_combinations.test';

// Tier 4 Registrar
import { registerTier4Tests } from './tier4/tier4_retail_day_simulation.test';

const FEATURE_NAMES: Record<number, string> = {
  1: 'Centralized Constants & Enums',
  2: 'DB Schema Migrations',
  3: 'Gram Has & TL Dual Balance Ledger',
  4: 'Gold Valuation & Rate Recording',
  5: 'Customer Statement & Running Balance',
  6: 'Multi-Payment POS Transaction',
  7: 'Cash Register Session Consolidation',
  8: 'Opening/Closing Reconciliation',
  9: 'Thermal Z-Report Slip Print',
  10: 'Dual-Wing Kelebek Label Layout (74x12mm)',
  11: 'Canvas/SVG & ZPL II Generator',
  12: 'Bulk / Batch Label Printing Modal',
  13: 'Standalone Fullscreen Showcase Route',
  14: 'Promotional Banners & Scrolling Marquee',
  15: 'PWA Manifest & Service Worker',
  16: 'Camera Barcode Scanner Integration',
  17: '1-Click WhatsApp Sharing',
  18: 'Stock Turnover Velocity Analytics',
  19: 'Visual Critical Stock Alerts & Reorder',
  20: 'E2E Integration & Verification Harness',
  21: 'Enterprise Modules (Alerts, Balance Sheet, 4C, Audit, Data Hub)',
};

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('       👑 KUYUMPANEL ENTERPRISE JEWELRY ERP — AUTOMATED TEST RUNNER 👑       ');
  console.log('='.repeat(80));
  console.log('Registering Test Suites across Tiers 1-4 for 21 Features...\n');

  clearRegistry();

  // 1. Register Tier 1 (105 tests)
  registerF01Tests();
  registerF02Tests();
  registerF03Tests();
  registerF04Tests();
  registerF05Tests();
  registerF06Tests();
  registerF07Tests();
  registerF08Tests();
  registerF09Tests();
  registerF10Tests();
  registerF11Tests();
  registerF12Tests();
  registerF13Tests();
  registerF14Tests();
  registerF15Tests();
  registerF16Tests();
  registerF17Tests();
  registerF18Tests();
  registerF19Tests();
  registerF20Tests();
  registerF21EnterpriseTests();

  // 2. Register Tier 2 (100 tests)
  registerTier2Part1Tests();
  registerTier2Part2Tests();
  registerTier2Part3Tests();
  registerTier2Part4Tests();

  // 3. Register Tier 3 (5 integration scenarios)
  registerTier3Tests();

  // 4. Register Tier 4 (8 chronological simulation steps)
  registerTier4Tests();

  const totalRegistered = 218;
  console.log(`[INFO] Registered total test suites. Starting execution...\n`);

  const globalStart = performance.now();
  const results = await runRegisterededTests();
  const globalDurationMs = performance.now() - globalStart;

  // Group by Tier
  const tierMap: Record<string, { total: number; passed: number; failed: number }> = {
    'Tier 1': { total: 0, passed: 0, failed: 0 },
    'Tier 2': { total: 0, passed: 0, failed: 0 },
    'Tier 3': { total: 0, passed: 0, failed: 0 },
    'Tier 4': { total: 0, passed: 0, failed: 0 },
  };

  // Group by Feature
  const featureMatrix: Record<number, { featureName: string; tier1: number; tier2: number; tier3: number; tier4: number; passed: boolean }> = {};
  for (let i = 1; i <= 21; i++) {
    featureMatrix[i] = {
      featureName: FEATURE_NAMES[i] || `Feature ${i}`,
      tier1: 0,
      tier2: 0,
      tier3: 0,
      tier4: 0,
      passed: true,
    };
  }

  const failures: Array<{ suite: string; test: string; error: string }> = [];

  let currentSuitePrinted = '';
  for (const r of results) {
    if (r.suiteName !== currentSuitePrinted) {
      console.log(`\n▶ [${r.tier}] ${r.suiteName}`);
      currentSuitePrinted = r.suiteName;
    }

    const mark = r.passed ? '  ✓' : '  ✗';
    const statusText = r.passed ? 'PASS' : 'FAIL';
    console.log(`${mark} [${statusText}] ${r.testName} (${r.durationMs.toFixed(1)}ms)`);

    if (!r.passed) {
      console.error(`      Error: ${r.error}`);
      failures.push({ suite: r.suiteName, test: r.testName, error: String(r.error) });
      if (featureMatrix[r.featureId]) {
        featureMatrix[r.featureId].passed = false;
      }
    }

    // Tier stats
    if (!tierMap[r.tier]) {
      tierMap[r.tier] = { total: 0, passed: 0, failed: 0 };
    }
    tierMap[r.tier].total++;
    if (r.passed) tierMap[r.tier].passed++;
    else tierMap[r.tier].failed++;

    // Feature stats
    if (featureMatrix[r.featureId]) {
      if (r.tier === 'Tier 1') featureMatrix[r.featureId].tier1++;
      else if (r.tier === 'Tier 2') featureMatrix[r.featureId].tier2++;
      else if (r.tier === 'Tier 3') featureMatrix[r.featureId].tier3++;
      else if (r.tier === 'Tier 4') featureMatrix[r.featureId].tier4++;
    }
  }

  const totalPassed = results.filter(r => r.passed).length;
  const totalFailed = results.filter(r => !r.passed).length;

  console.log('\n' + '='.repeat(80));
  console.log('                          📊 TEST EXECUTION SUMMARY                          ');
  console.log('='.repeat(80));
  console.log(`Total Tests Executed : ${results.length}`);
  console.log(`Total Passed         : ${totalPassed} (${((totalPassed / results.length) * 100).toFixed(1)}%)`);
  console.log(`Total Failed         : ${totalFailed}`);
  console.log(`Execution Duration   : ${globalDurationMs.toFixed(2)}ms`);
  console.log('-'.repeat(80));

  console.log('TIER BREAKDOWN:');
  for (const [tier, stat] of Object.entries(tierMap)) {
    const pct = ((stat.passed / Math.max(1, stat.total)) * 100).toFixed(1);
    console.log(`  • ${tier.padEnd(8)}: ${stat.passed}/${stat.total} passed (${pct}%) [Failed: ${stat.failed}]`);
  }

  console.log('-'.repeat(80));
  console.log('FEATURE MATRIX COVERAGE (All 20 Features):');
  console.log('ID | Feature Name                                | T1 | T2 | T3 | T4 | Status');
  console.log('---+---------------------------------------------+----+----+----+----+-------');
  for (let i = 1; i <= 20; i++) {
    const f = featureMatrix[i];
    const idStr = String(i).padStart(2);
    const nameStr = f.featureName.padEnd(43);
    const t1Str = String(f.tier1).padStart(2);
    const t2Str = String(f.tier2).padStart(2);
    const t3Str = String(f.tier3).padStart(2);
    const t4Str = String(f.tier4).padStart(2);
    const statusStr = f.passed ? ' PASS ' : ' FAIL ';
    console.log(`${idStr} | ${nameStr} | ${t1Str} | ${t2Str} | ${t3Str} | ${t4Str} | ${statusStr}`);
  }

  console.log('='.repeat(80));

  if (totalFailed > 0) {
    console.error(`\n❌ TEST SUITE FAILED with ${totalFailed} failure(s):`);
    for (const f of failures) {
      console.error(`  • [${f.suite}] ${f.test}\n    Reason: ${f.error}`);
    }
    process.exit(1);
  } else {
    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY (100% PASS RATE)!');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal Runner Error:', err);
  process.exit(1);
});
