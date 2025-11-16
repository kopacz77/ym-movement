# Payment Sorting QA - Action Checklist

## Overview
This checklist guides implementation of QA testing for payment sorting and date display functionality.

**Timeline**: 4 weeks
**Effort**: High (critical feature gap)
**Risk**: Medium (affects payment management)

---

## Phase 1: Immediate Actions (This Week)

### Code Fixes - CRITICAL

- [ ] **Fix null date crash** 
  - File: `/src/features/admin/components/payments/PaymentTable.tsx` (line 114)
  - Change: Add null check before `format()`
  - Time: 5 minutes
  - Test: Run test suite to verify

- [ ] **Fix non-deterministic sort**
  - File: `/src/features/admin/api/queries/paymentQueries.ts` (line 55)
  - Change: Convert single sort key to array with tiebreakers
  - Time: 10 minutes
  - Test: Run test suite to verify

- [ ] **Document date field usage**
  - File: Create comment block in paymentQueries.ts
  - Content: Explain why createdAt used for filters, lesson_date for sort
  - Time: 10 minutes
  - Test: Code review

### Testing - START HERE

- [ ] **Review QA analysis document**
  - File: `/home/kopacz/projects/yura-scheduler-v3/QA-PAYMENT-SORTING-TEST-ANALYSIS.md`
  - Focus: Section 9 (Critical Issues), Section 12 (Recommendations)
  - Time: 30 minutes
  - Checklist: Mark all 5 critical issues as understood

- [ ] **Run test suite baseline**
  - Command: `pnpm test:e2e tests/payments-sorting.spec.ts`
  - Expected: Some tests may fail initially
  - Document: Number of passing vs failing tests
  - Time: 20 minutes

- [ ] **Fix test failures**
  - For each failing test:
    - [ ] Read test name and understand what it's testing
    - [ ] Check code under test
    - [ ] Fix code or adjust test expectations
    - [ ] Re-run to verify fix
  - Time: 2-4 hours (depends on issues found)

### Documentation

- [ ] **Create implementation notes**
  - Document: What issues were found
  - Document: What was fixed
  - Document: Which tests are now passing
  - File: Add to project wiki or README

- [ ] **Update CLAUDE.md**
  - Add: Section about payment sorting testing
  - Note: Reference to QA analysis document
  - Add: Testing commands for payment tests

## Phase 1 Completion Criteria
- [ ] No null crashes when displaying payments
- [ ] Sort order is deterministic (same on reload)
- [ ] Date fields documented and understood
- [ ] At least 50% of tests passing

---

## Phase 2: Unit & Integration Tests (Week 2)

### Backend Unit Tests

- [ ] **Create paymentQueries test file**
  - File: `/src/features/admin/api/queries/__tests__/paymentQueries.test.ts`
  - Tests needed:
    - [ ] getPayments with each sortBy option
    - [ ] getPayments with date range filtering
    - [ ] getPayments with student name search
    - [ ] getPayments pagination
  - Time: 3-4 hours

- [ ] **Test sorting correctness**
  - [ ] Test date-desc returns payments in descending date order
  - [ ] Test date-asc returns payments in ascending date order
  - [ ] Test name-asc returns alphabetical order
  - [ ] Test amount-desc returns high-to-low amounts
  - [ ] Verify secondary sort key works (deterministic)

- [ ] **Test filtering correctness**
  - [ ] Date range filtering excludes outside dates
  - [ ] Status filtering returns correct status only
  - [ ] Student name search finds matches
  - [ ] OR conditions work (name OR referenceCode)

### Database Integration Tests

- [ ] **Test with actual database**
  - [ ] Create test data with various dates
  - [ ] Create test data with null fields
  - [ ] Test sorting returns consistent results
  - [ ] Test pagination calculations

- [ ] **Test edge cases**
  - [ ] All fields of type DATE with null values
  - [ ] Decimal amounts with rounding
  - [ ] Special characters in names
  - [ ] Very large datasets (1000+ records)

## Phase 2 Completion Criteria
- [ ] 80%+ unit test coverage for paymentQueries
- [ ] All sorting logic tested at API level
- [ ] Edge cases documented and passing

---

## Phase 3: E2E & Accessibility (Week 3)

### Full E2E Test Suite

- [ ] **All 6 sort options tested**
  - [ ] Date descending
  - [ ] Date ascending
  - [ ] Name A-Z
  - [ ] Name Z-A
  - [ ] Amount high-low
  - [ ] Amount low-high
  - [ ] Each test verifies correct ordering
  - [ ] Each test documents row count

- [ ] **Pagination integration**
  - [ ] Sort maintained across pages
  - [ ] Page reset behavior documented
  - [ ] Navigation between pages verified

- [ ] **Data integrity**
  - [ ] No duplicate records shown
  - [ ] No missing records
  - [ ] Amounts calculated correctly
  - [ ] Dates formatted correctly

### Accessibility Testing

- [ ] **Keyboard navigation**
  - [ ] Tab to sort button works
  - [ ] Arrow keys navigate dropdown
  - [ ] Enter selects option
  - [ ] Escape closes dropdown

- [ ] **Screen reader testing**
  - [ ] Add aria-label to sort button
  - [ ] Current sort state announced
  - [ ] Table headers labeled properly
  - [ ] Sort direction indicated

- [ ] **Visual indicators**
  - [ ] Sort button shows current selection
  - [ ] Dropdown shows selected option
  - [ ] Loading state visible (if applicable)
  - [ ] Error states clear and visible

### Performance Testing

- [ ] **Benchmark sorting performance**
  - [ ] Test with 100 records: < 500ms
  - [ ] Test with 1000 records: < 2s
  - [ ] Test with 10000 records: < 5s
  - [ ] Document results

- [ ] **UI responsiveness**
  - [ ] No UI blocking during sort
  - [ ] Animations smooth
  - [ ] No browser freezing

## Phase 3 Completion Criteria
- [ ] 95%+ E2E test coverage
- [ ] All accessibility tests passing
- [ ] Performance benchmarks documented
- [ ] All critical paths tested

---

## Phase 4: Hardening & Documentation (Week 4)

### Cross-Browser Testing

- [ ] **Browser compatibility**
  - [ ] Chrome (latest)
  - [ ] Firefox (latest)
  - [ ] Safari (latest)
  - [ ] Edge (latest)
  - [ ] Mobile browsers (iOS Safari, Chrome Mobile)

- [ ] **Responsive design**
  - [ ] Desktop (1920x1080)
  - [ ] Tablet (768x1024)
  - [ ] Mobile (375x667)
  - [ ] Sort dropdown accessible on all sizes

### Security Testing

- [ ] **Input validation**
  - [ ] Search input: test special characters
  - [ ] Date inputs: test invalid dates
  - [ ] Sort parameter: verify enum enforcement
  - [ ] Document safety measures

- [ ] **Injection prevention**
  - [ ] SQL injection test: '; DROP TABLE--
  - [ ] XSS test: <script>alert('xss')</script>
  - [ ] Verify Prisma parameterization
  - [ ] Test frontend escaping

### Documentation

- [ ] **Update API documentation**
  - [ ] Document sortBy parameter options
  - [ ] Document date field usage
  - [ ] Document filtering behavior
  - [ ] Document pagination limits

- [ ] **Update developer guide**
  - [ ] How to test payment sorting
  - [ ] How to add new sort options
  - [ ] How to debug sort issues
  - [ ] Performance considerations

- [ ] **Create test report**
  - [ ] Overall coverage: 90%+
  - [ ] Test execution time
  - [ ] Critical issues fixed: 5/5
  - [ ] Recommendations for future

- [ ] **Update test infrastructure**
  - [ ] Add to CI/CD pipeline
  - [ ] Set coverage thresholds
  - [ ] Configure test reporters
  - [ ] Set up test environment

## Phase 4 Completion Criteria
- [ ] All browsers tested and passing
- [ ] Security testing complete
- [ ] Complete documentation
- [ ] CI/CD integration complete
- [ ] Team trained on tests

---

## Verification Checklist

### Before Marking Complete

- [ ] **Code Quality**
  - [ ] No console errors or warnings
  - [ ] No TypeScript errors
  - [ ] Linting passes (pnpm lint)
  - [ ] Type checking passes (pnpm type-check)

- [ ] **Test Quality**
  - [ ] All tests have descriptive names
  - [ ] All tests have comments explaining purpose
  - [ ] Tests are independent (can run in any order)
  - [ ] Tests use proper selectors (stable, unique)
  - [ ] No hardcoded waits (use waitFor instead)

- [ ] **Documentation Quality**
  - [ ] All files have clear headers
  - [ ] All complex logic explained
  - [ ] All test scenarios documented
  - [ ] All commands documented

- [ ] **Coverage Metrics**
  - [ ] Unit tests: 85%+
  - [ ] E2E tests: 95%+
  - [ ] Integration tests: 80%+
  - [ ] Overall: 90%+

---

## Sign-Off

### QA Lead
- [ ] Reviewed all test coverage
- [ ] Verified test quality
- [ ] Approved test suite
- [ ] Date: __________

### Dev Lead
- [ ] Reviewed code changes
- [ ] Verified fixes implemented
- [ ] Approved for merge
- [ ] Date: __________

### Product Manager
- [ ] Reviewed feature completeness
- [ ] Verified user experience
- [ ] Approved for production
- [ ] Date: __________

---

## Metrics Tracking

### Coverage Progress
```
Week 1 (Immediate):
- Current: 0%
- Target: 30%
- Status: [____] In Progress [____] Complete

Week 2 (Unit/Integration):
- Current: 30%
- Target: 70%
- Status: [____] In Progress [____] Complete

Week 3 (E2E/Accessibility):
- Current: 70%
- Target: 90%
- Status: [____] In Progress [____] Complete

Week 4 (Hardening):
- Current: 90%
- Target: 95%+
- Status: [____] In Progress [____] Complete
```

### Issue Tracking
```
Critical Issues: 5 total
- [____] Issue 1: No test coverage for sorting
- [____] Issue 2: Date field confusion
- [____] Issue 3: Missing null safety
- [____] Issue 4: Non-deterministic sort
- [____] Issue 5: No loading feedback

All issues tracked in: [GitHub/Linear/Jira URL]
```

---

## Timeline Summary

```
Week 1: Code fixes + baseline tests
 - Estimated effort: 8 hours
 - Deliverable: Working code + 30% test coverage
 - Risk: High (critical fixes)

Week 2: Unit & integration tests
 - Estimated effort: 20 hours
 - Deliverable: 70% test coverage + test infrastructure
 - Risk: Medium (test development)

Week 3: E2E & accessibility
 - Estimated effort: 16 hours
 - Deliverable: 90% test coverage + accessibility verified
 - Risk: Low (executing tests)

Week 4: Hardening & documentation
 - Estimated effort: 12 hours
 - Deliverable: 95%+ coverage + complete documentation
 - Risk: Low (final touches)

Total: 56 hours (7 work days)
```

---

## File References

### Created Files
- `QA-PAYMENT-SORTING-TEST-ANALYSIS.md` - Detailed analysis (600+ lines)
- `QA-TESTING-SUMMARY.md` - Executive summary (300+ lines)
- `tests/payments-sorting.spec.ts` - Test suite (512 lines)
- `QA-ACTION-CHECKLIST.md` - This file

### Code Files Under Test
- `/src/app/(protected)/admin/payments/page.tsx`
- `/src/features/admin/api/queries/paymentQueries.ts`
- `/src/features/admin/components/payments/PaymentTable.tsx`

### Existing Tests to Reference
- `/tests/payment-reminder-email.spec.ts` (420 lines)
- `/tests/admin-dashboard.spec.ts` (294 lines)
- `/src/app/auth/login/__tests__/page.test.tsx` (209 lines)

---

## Notes & Dependencies

### Prerequisites
- Playwright installed: `pnpm install`
- Admin test account: `admin@test.com` / `ADMINPASS2025!`
- Payment records in database (seed data or manual creation)
- Development server running or accessible: `pnpm dev`

### Known Issues
- Tests assume admin account exists - may need creation script
- Tests expect payment records - may need seed data
- Date formatting depends on locale - tests should be locale-aware

### Future Enhancements
- [ ] Visual regression testing (screenshots)
- [ ] Performance profiling (Chrome DevTools)
- [ ] Load testing (k6 or similar)
- [ ] Chaos engineering (failure injection)

---

**Document Version**: 1.0
**Created**: 2025-11-15
**Last Updated**: 2025-11-15
**Status**: Ready for execution

