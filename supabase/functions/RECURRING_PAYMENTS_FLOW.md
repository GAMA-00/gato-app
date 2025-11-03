# Recurring Payments Flow (Post-Refactor)

## Overview
Recurring payments (memberships) now follow the same authorize → accept → capture flow as regular prepaid services, with automatic future charges handled by a scheduler.

## New Flow

### 1. Initial Booking (First Charge)
**When:** Client books a recurring service
**Function:** `onvopay-initiate-recurring`
- Creates a Payment Intent with `payment_type: 'recurring_initial'`
- Uses saved `payment_method_id` from subscription
- Payment status: `pending_authorization`
- **Same as prepaid services**

### 2. Provider Accepts (Capture Initial Charge)
**When:** Provider accepts the recurring appointment
**Function:** `onvopay-capture-on-provider-accept`
- Confirms and captures the initial payment immediately
- Updates subscription with `initial_charge_date`
- Sets `loop_status: 'manual_scheduling'` (ready for future charges)
- **Same flow for both recurring and non-recurring**

### 3. Future Recurring Charges
**When:** Scheduler runs (daily/weekly)
**Function:** `process-recurring-charges`
- Finds subscriptions with `next_charge_date <= today`
- Creates Payment Intent using OnvoPay API
- Confirms with saved `payment_method_id`
- Captures immediately (auto-charge)
- Updates `last_charge_date` and `next_charge_date`
- Handles failures and retry logic

## Database Schema

### onvopay_subscriptions (Updated)
```sql
-- New fields added:
onvopay_loop_id TEXT              -- Reserved for future OnvoPay Loop integration
loop_status TEXT                  -- manual_scheduling | loop_active | loop_paused | loop_cancelled
initial_charge_date DATE          -- When first charge was captured
loop_metadata JSONB               -- Reserved for OnvoPay Loop data
```

### onvopay_payments
```sql
-- Valid payment_type values:
- 'appointment'        -- Regular one-time services
- 'recurring_initial'  -- First charge of recurring membership
- 'recurring_charge'   -- Subsequent recurring charges
- 'loop_charge'       -- Future: Charges from OnvoPay Loop
- 'subscription'      -- Legacy (existing records)
- 'cash'              -- Manual payments
```

## Key Differences from Old Flow

### OLD FLOW ❌ (Deprecated)
1. Appointment created → Payment Intent in "initiated" state
2. **Wait for appointment completion**
3. Trigger fires → `onvopay-process-membership-charge`
4. Create Payment Intent → Confirm → Capture
5. Separate sweeper for missed charges

**Problems:**
- Charged AFTER service completion (not upfront)
- Complex triggers and sweepers
- Payment created twice (initiate + process)

### NEW FLOW ✅ (Current)
1. Appointment created → Payment Intent `pending_authorization`
2. **Provider accepts** → Capture immediately (like prepaid)
3. Scheduler handles future charges automatically

**Benefits:**
- Charges upfront when provider accepts (standard prepaid flow)
- Simpler architecture (no completion triggers)
- Unified flow for all appointment types
- Better user experience (consistent with prepaid)

## Deprecated Functions

These functions are no longer actively used but kept for backwards compatibility:

- ✅ **onvopay-process-membership-charge** - Replaced by provider accept capture
- ✅ **onvopay-sweep-completed-recurring** - Replaced by process-recurring-charges scheduler

## Future: OnvoPay Loop Integration

The database is prepared for future migration to OnvoPay Loop API:
- `onvopay_loop_id` - Will store OnvoPay subscription ID
- `loop_status: 'loop_active'` - Will indicate OnvoPay is handling charges
- `loop_metadata` - Will store OnvoPay subscription details

When OnvoPay Loop is implemented:
1. Initial charge: Still handled by provider accept (same)
2. Future charges: Delegated to OnvoPay Loop webhooks
3. Update `loop_status` from `manual_scheduling` to `loop_active`
4. Deprecate `process-recurring-charges` scheduler

## Testing Flow

### Test Initial Recurring Charge
1. Create recurring appointment with saved payment method
2. Verify Payment Intent created with status `pending_authorization`
3. Provider accepts appointment
4. Verify payment captured immediately
5. Verify subscription updated with `initial_charge_date`

### Test Future Recurring Charge
1. Set subscription `next_charge_date` to today
2. Run `process-recurring-charges` function
3. Verify new payment created with `payment_type: 'recurring_charge'`
4. Verify payment captured
5. Verify `next_charge_date` updated to next occurrence

## Monitoring

### Key Metrics
- Initial charges: Monitor `onvopay-capture-on-provider-accept` logs
- Future charges: Monitor `process-recurring-charges` success rate
- Failed attempts: Check `onvopay_subscriptions.failed_attempts`
- Auto-cancellations: Subscriptions with `status = 'cancelled'`

### Common Issues
1. **No payment method saved**: Subscription skipped in scheduler
2. **Failed charge**: Increments `failed_attempts`, cancels after max retries
3. **Provider doesn't accept**: Initial charge not captured (normal behavior)
