# Issue: PR #1.5 - Complete Unified Logging Migration

## 📋 Overview

Complete the migration of remaining ~100 files from `console.*` to unified `logger` system started in PR #1.

**Related PRs**:
- ✅ PR #1: Migrated 15 critical files (auth, contexts, dashboard) - MERGED
- ⏳ PR #1.5: This issue - Remaining ~100 files

**Priority**: Medium (non-blocking for PR #2 and PR #3)

---

## 🎯 Objectives

1. Migrate all remaining `console.*` statements to `logger` calls
2. Maintain 100% code coverage with unified logging
3. Ensure `no-console` ESLint rule has no violations
4. No changes to business logic or behavior

---

## 📊 Scope

### Total Files Remaining: ~100

#### Batch 1: Critical Hooks (15-20 files) - HIGH PRIORITY
- [ ] `src/hooks/useAvailabilitySync.ts` (584 console.* occurrences)
- [ ] `src/hooks/useCalendarAppointments.ts`
- [ ] `src/hooks/useCalendarRecurringSystem.ts`
- [ ] `src/hooks/useCategories.ts`
- [ ] `src/hooks/useCommissionRate.ts`
- [ ] `src/hooks/useCondominiums.ts`
- [ ] `src/hooks/useResidencias.ts`
- [ ] `src/hooks/useProviderMerits.ts`
- [ ] `src/hooks/useDashboardAppointments.ts`
- [ ] `src/hooks/useAppointmentCompletion.ts`
- [ ] And ~10 more hooks...

#### Batch 2: Critical Utils (10-15 files) - HIGH PRIORITY
- [ ] `src/utils/appointmentUtils.ts` (353 console.* occurrences)
- [ ] `src/utils/appointmentValidation.ts`
- [ ] `src/utils/bookingValidation.ts`
- [ ] `src/utils/enhancedBookingValidation.ts`
- [ ] `src/utils/availabilitySlotGenerator.ts`
- [ ] `src/utils/authUtils.ts`
- [ ] `src/utils/slotSyncUtils.ts`
- [ ] `src/utils/serviceDetailsFormatter.ts`
- [ ] And ~7 more utils...

#### Batch 3: Lib/Recurrence (5 files) - MEDIUM PRIORITY
- [ ] `src/lib/recurrence/generator.ts` (40 console.* occurrences)
- [ ] `src/lib/recurrence/index.ts`
- [ ] `src/lib/recurrence/utils.ts`
- [ ] `src/lib/recurrence/scheduler.ts`
- [ ] `src/lib/recurrence/types.ts`

#### Batch 4: Client Components (20-30 files) - MEDIUM PRIORITY
- [ ] `src/components/client/booking/*` (~15 files)
- [ ] `src/components/client/results/*` (~5 files)
- [ ] `src/components/client/search/*` (~5 files)
- [ ] Other client components (~5-10 files)

#### Batch 5: Provider Components (10-15 files) - MEDIUM PRIORITY
- [ ] `src/components/provider/services/*` (~5 files)
- [ ] `src/components/provider/availability/*` (~3 files)
- [ ] `src/components/provider/calendar/*` (~3 files)
- [ ] Other provider components (~4-9 files)

#### Batch 6: Admin Components (5-10 files) - LOW PRIORITY
- [ ] `src/components/admin/*` (all files if any have console.*)

#### Batch 7: Pages (10-15 files) - LOW PRIORITY
- [ ] `src/pages/*` (remaining pages with console.*)

#### Batch 8: Cleanup (20-30 files) - LOW PRIORITY
- [ ] Miscellaneous components with console.*
- [ ] UI components
- [ ] Shared utilities

---

## 🚫 Exclusions (DO NOT MIGRATE)

These files have critical behavior markers and must NOT be modified:

- ❌ `src/utils/robustBookingSystem.ts` (DO_NOT_CHANGE_BEHAVIOR)
- ❌ `src/hooks/useRecurringBooking.ts` (DO_NOT_CHANGE_BEHAVIOR)
- ❌ Edge functions with payment logic
- ❌ Atomic booking flows
- ❌ `src/utils/logger.ts` itself (requires console.* for implementation)

---

## ✅ Acceptance Criteria

### Code Quality
- [ ] All `console.*` statements replaced with appropriate `logger.*` calls
- [ ] Correct logger instance used (authLogger, bookingLogger, etc.)
- [ ] Appropriate log levels (debug/info/warn/error)
- [ ] Meaningful context objects passed to logger

### Testing
- [ ] `npm run lint` passes with no console.* violations
- [ ] `npm run build` succeeds
- [ ] All smoke tests pass (login, dashboard, booking, calendar)
- [ ] No console errors in browser DevTools

### Documentation
- [ ] All migrated files documented in PR description
- [ ] Migration patterns consistent with PR #1
- [ ] Any edge cases or special handling documented

### Behavior
- [ ] Zero changes to business logic
- [ ] Zero changes to user-facing functionality
- [ ] Zero performance degradation
- [ ] Golden snapshots unchanged

---

## 📝 Implementation Guidelines

### Migration Pattern

**Before**:
```typescript
console.log('Processing appointment', appointmentId);
console.error('Failed to process:', error);
console.warn('Deprecated API used');
console.debug('Internal state:', state);
```

**After**:
```typescript
import { bookingLogger } from '@/utils/logger';

bookingLogger.info('Processing appointment', { appointmentId });
bookingLogger.error('Failed to process', error);
bookingLogger.warn('Deprecated API used');
bookingLogger.debug('Internal state', { state });
```

### Logger Selection

Choose appropriate logger based on module:
- **authLogger**: Authentication, login, logout, sessions
- **bookingLogger**: Appointments, reservations, scheduling
- **calendarLogger**: Calendar views, date navigation
- **recurringLogger**: Recurring appointments, rules
- **locationLogger**: Location building, address handling
- **apiLogger**: API calls, external integrations
- **logger**: Generic/default logger

### Log Levels

- **debug**: Detailed diagnostic info (dev only)
- **info**: General informational messages
- **warn**: Warning conditions, deprecated usage
- **error**: Error conditions, exceptions

---

## 🔄 Workflow

### Step 1: Batch Selection
Pick a batch from high to low priority

### Step 2: Migration
1. Read file to understand context
2. Replace console.* with logger.* using correct logger instance
3. Ensure proper log levels and context objects
4. Save changes

### Step 3: Validation
1. Run `npm run lint` (should pass)
2. Run `npm run build` (should succeed)
3. Test affected functionality
4. Check browser console (should be clean)

### Step 4: Documentation
Update this issue with:
- [x] Checkbox for completed file
- Brief notes on any special handling

### Step 5: PR Creation
When batch is complete:
1. Create PR with descriptive title
2. Reference this issue
3. Include before/after examples
4. Run full smoke tests

---

## 📊 Progress Tracking

### Overall Progress
- [x] PR #1: 15/15 files (100%) - ✅ MERGED
- [ ] PR #1.5: 0/100 files (0%)

**Total**: 15/115 files migrated (13%)

### Batch Progress
- [ ] Batch 1 (Hooks): 0/20 (0%)
- [ ] Batch 2 (Utils): 0/15 (0%)
- [ ] Batch 3 (Lib): 0/5 (0%)
- [ ] Batch 4 (Client): 0/30 (0%)
- [ ] Batch 5 (Provider): 0/15 (0%)
- [ ] Batch 6 (Admin): 0/10 (0%)
- [ ] Batch 7 (Pages): 0/15 (0%)
- [ ] Batch 8 (Cleanup): 0/30 (0%)

---

## 🎯 Success Metrics

- [ ] 100% of targetable files migrated
- [ ] 0 ESLint violations for `no-console`
- [ ] 0 behavior changes
- [ ] 0 test failures
- [ ] 0 console.* in migrated files

---

## 🔗 Related Documents

- `PR_1_REPORTE_FINAL.md` - PR #1 completion report
- `PR_1.5_LOGGING_BACKLOG.md` - Detailed file listing
- `src/utils/logger.ts` - Logger implementation
- `eslint.config.js` - ESLint no-console configuration

---

## 📅 Timeline

**Estimated Effort**: 3-4 hours total
- Batch 1-2: 1.5 hours (high priority)
- Batch 3-5: 1.5 hours (medium priority)
- Batch 6-8: 1 hour (low priority)

**Recommended Approach**: 
- Complete in 2-3 separate PRs
- PR #1.5a: Batches 1-2 (critical)
- PR #1.5b: Batches 3-5 (medium)
- PR #1.5c: Batches 6-8 (cleanup)

---

## 💬 Comments & Updates

_Updates will be added here as work progresses_

---

**Created**: 2025-01-XX  
**Status**: 🟡 Open  
**Assignee**: TBD  
**Labels**: `refactor`, `logging`, `non-breaking`, `medium-priority`
