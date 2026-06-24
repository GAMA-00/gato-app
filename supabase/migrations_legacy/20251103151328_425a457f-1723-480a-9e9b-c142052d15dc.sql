-- Phase 1: Add Loop-ready fields to onvopay_subscriptions
ALTER TABLE onvopay_subscriptions
ADD COLUMN IF NOT EXISTS onvopay_loop_id TEXT,
ADD COLUMN IF NOT EXISTS loop_status TEXT DEFAULT 'manual_scheduling',
ADD COLUMN IF NOT EXISTS initial_charge_date DATE,
ADD COLUMN IF NOT EXISTS loop_metadata JSONB DEFAULT '{}'::jsonb;

-- Add comment explaining loop_status values
COMMENT ON COLUMN onvopay_subscriptions.loop_status IS 'Status: manual_scheduling (current), pending_loop_activation (ready for OnvoPay Loop), loop_active (using OnvoPay Loop), loop_paused, loop_cancelled';

-- Phase 2: Remove old triggers and functions (triggers first, then functions with CASCADE)
DROP TRIGGER IF EXISTS on_appointment_insert_initiate_payment ON appointments CASCADE;
DROP TRIGGER IF EXISTS trigger_initiate_recurring_payment_on_insert ON appointments CASCADE;
DROP TRIGGER IF EXISTS on_appointment_completed_charge_membership ON appointments CASCADE;

DROP FUNCTION IF EXISTS trigger_initiate_recurring_payment_on_insert() CASCADE;
DROP FUNCTION IF EXISTS on_appointment_completed_charge_membership() CASCADE;

-- Phase 3: Remove problematic payment_type check constraint
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint name
    SELECT con.conname INTO constraint_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
    AND rel.relname = 'onvopay_payments'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%payment_type%';
    
    -- Drop it if found
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE onvopay_payments DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END IF;
END $$;

-- Add new flexible constraint that includes existing types
ALTER TABLE onvopay_payments
ADD CONSTRAINT payment_type_check CHECK (
    payment_type IN (
        'appointment',          -- Regular one-time services
        'recurring_initial',    -- First charge of recurring membership
        'recurring_charge',     -- Subsequent recurring charges
        'loop_charge',         -- Charges from OnvoPay Loop (future)
        'subscription',        -- Legacy/existing type
        'cash'                 -- Manual payments
    )
);

-- Phase 4: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_onvopay_subscriptions_loop_id 
ON onvopay_subscriptions(onvopay_loop_id) WHERE onvopay_loop_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_onvopay_subscriptions_loop_status 
ON onvopay_subscriptions(loop_status);

CREATE INDEX IF NOT EXISTS idx_onvopay_subscriptions_next_charge 
ON onvopay_subscriptions(next_charge_date) 
WHERE status = 'active' AND loop_status = 'manual_scheduling';