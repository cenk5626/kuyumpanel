import { describe, it, test, expect, setTestContext } from '../helpers/test-utils';
import {
  APPROVAL_REQUEST_TYPE,
  APPROVAL_STATUS,
  APPROVAL_THRESHOLDS,
  APPROVAL_ROLES,
  APPROVAL_UNITS,
  APPROVAL_ERRORS,
} from '@/constants/approval';
import {
  needsApprovalForDiscount,
  needsApprovalForCashOutflow,
  determineRequiredLevel,
  validateFourEyesPrinciple,
  validateApprovalAction,
  buildApprovalSteps,
  calculateNextApprovalState,
  formatApprovalWhatsAppNotification,
} from '@/lib/approval/approval-engine';

export function registerF35ApprovalEngineTests() {
  setTestContext(
    'Tier 1',
    35,
    'Multi-Level Approval & Four-Eyes Principle',
    'F35: Çok Seviyeli Onay ve Denetim Akışları'
  );

  describe('Feature 35 - Çok Seviyeli Onay Motoru & Dört-Göz Prensibi', () => {
    test('35.1 Should not require approval for zero or negative discount or for SUPER_ADMIN', () => {
      expect(needsApprovalForDiscount(0, 'USER').required).toBe(false);
      expect(needsApprovalForDiscount(-5, 'USER').required).toBe(false);
      expect(needsApprovalForDiscount(25, 'SUPER_ADMIN').required).toBe(false);
    });

    test('35.2 Should require Level 1 (ADMIN) approval for discount between 10% and 20% for standard user', () => {
      const check1 = needsApprovalForDiscount(12, 'USER');
      expect(check1.required).toBe(true);
      expect(check1.requiredLevel).toBe(1);

      // ADMIN için %15 onay gerektirmez
      const checkAdmin = needsApprovalForDiscount(15, 'ADMIN');
      expect(checkAdmin.required).toBe(false);
    });

    test('35.3 Should require Level 2 (SUPER_ADMIN) approval for discount >= 20% even for ADMIN', () => {
      const checkUser = needsApprovalForDiscount(22, 'USER');
      expect(checkUser.required).toBe(true);
      expect(checkUser.requiredLevel).toBe(2);

      const checkAdmin = needsApprovalForDiscount(25, 'ADMIN');
      expect(checkAdmin.required).toBe(true);
      expect(checkAdmin.requiredLevel).toBe(2);
    });

    test('35.4 Should detect TL cash outflow thresholds (50K for L1, 200K for L2)', () => {
      expect(needsApprovalForCashOutflow(20000, 'TL').required).toBe(false);

      const checkL1 = needsApprovalForCashOutflow(60000, 'TL');
      expect(checkL1.required).toBe(true);
      expect(checkL1.requiredLevel).toBe(1);

      const checkL2 = needsApprovalForCashOutflow(250000, 'TL');
      expect(checkL2.required).toBe(true);
      expect(checkL2.requiredLevel).toBe(2);
    });

    test('35.5 Should detect HAS_GR outflow thresholds (25 gr for L1, 100 gr for L2)', () => {
      expect(needsApprovalForCashOutflow(10, 'HAS_GR').required).toBe(false);

      const checkL1 = needsApprovalForCashOutflow(30, 'HAS_GR');
      expect(checkL1.required).toBe(true);
      expect(checkL1.requiredLevel).toBe(1);

      const checkL2 = needsApprovalForCashOutflow(120, 'HAS_GR');
      expect(checkL2.required).toBe(true);
      expect(checkL2.requiredLevel).toBe(2);
    });

    test('35.6 Should strictly enforce Level 2 approval for BALANCE_WRITEOFF', () => {
      const level = determineRequiredLevel(APPROVAL_REQUEST_TYPE.BALANCE_WRITEOFF);
      expect(level).toBe(APPROVAL_THRESHOLDS.BALANCE_WRITEOFF_LEVEL);
      expect(level).toBe(2);
    });

    test('35.7 Should enforce Four-Eyes Principle: requester cannot approve or reject own request', () => {
      const checkSameId = validateFourEyesPrinciple('user1', 'ahmet@kuyum.com', 'user1', 'mehmet@kuyum.com');
      expect(checkSameId.valid).toBe(false);
      expect(checkSameId.error).toBe(APPROVAL_ERRORS.FOUR_EYES_VIOLATION);

      const checkSameEmail = validateFourEyesPrinciple('user1', 'ahmet@kuyum.com', 'user2', 'ahmet@kuyum.com');
      expect(checkSameEmail.valid).toBe(false);
      expect(checkSameEmail.error).toBe(APPROVAL_ERRORS.FOUR_EYES_VIOLATION);

      const checkValid = validateFourEyesPrinciple('user1', 'ahmet@kuyum.com', 'user2', 'patron@kuyum.com');
      expect(checkValid.valid).toBe(true);
    });

    test('35.8 validateApprovalAction should enforce mandatory rejection reason on REJECT', () => {
      const req = {
        status: APPROVAL_STATUS.PENDING,
        requesterId: 'u1',
        requesterEmail: 'u1@test.com',
        currentLevel: 1,
        requiredLevel: 1,
      };
      const approver = { id: 'u2', email: 'u2@test.com', role: 'ADMIN' };

      const rejectedWithoutReason = validateApprovalAction(req, approver, 'REJECT', '');
      expect(rejectedWithoutReason.valid).toBe(false);
      expect(rejectedWithoutReason.error).toBe(APPROVAL_ERRORS.REJECTION_REASON_REQUIRED);

      const rejectedWithReason = validateApprovalAction(req, approver, 'REJECT', 'Marj yetersiz');
      expect(rejectedWithReason.valid).toBe(true);
    });

    test('35.9 validateApprovalAction should enforce SUPER_ADMIN role for Level 2 steps', () => {
      const req = {
        status: APPROVAL_STATUS.PENDING,
        requesterId: 'u1',
        requesterEmail: 'u1@test.com',
        currentLevel: 2,
        requiredLevel: 2,
      };

      const adminApprover = { id: 'u2', email: 'u2@test.com', role: 'ADMIN' };
      const resAdmin = validateApprovalAction(req, adminApprover, 'APPROVE');
      expect(resAdmin.valid).toBe(false);
      expect(resAdmin.error).toBe(APPROVAL_ERRORS.INSUFFICIENT_ROLE);

      const superApprover = { id: 'u3', email: 'u3@test.com', role: 'SUPER_ADMIN' };
      const resSuper = validateApprovalAction(req, superApprover, 'APPROVE');
      expect(resSuper.valid).toBe(true);
    });

    test('35.10 calculateNextApprovalState should advance level or fully approve correctly', () => {
      // 2 Kademeli talep, 1. kademe onaylandı => Beklemede ve 2. kademeye geçmeli
      const step1Result = calculateNextApprovalState(1, 2, 'APPROVE');
      expect(step1Result.newStatus).toBe(APPROVAL_STATUS.PENDING);
      expect(step1Result.nextLevel).toBe(2);
      expect(step1Result.isFullyApproved).toBe(false);

      // 2 Kademeli talep, 2. kademe onaylandı => Tamamen onaylandı (APPROVED)
      const step2Result = calculateNextApprovalState(2, 2, 'APPROVE');
      expect(step2Result.newStatus).toBe(APPROVAL_STATUS.APPROVED);
      expect(step2Result.isFullyApproved).toBe(true);

      // Herhangi bir kademede ret => REJECTED
      const rejectResult = calculateNextApprovalState(1, 2, 'REJECT');
      expect(rejectResult.newStatus).toBe(APPROVAL_STATUS.REJECTED);
      expect(rejectResult.isFullyApproved).toBe(false);
    });
  });
}
