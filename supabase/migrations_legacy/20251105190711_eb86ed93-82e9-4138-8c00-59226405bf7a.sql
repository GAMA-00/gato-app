-- ============================================
-- PLAN COMPLETO DE LIMPIEZA Y RESET DEL SISTEMA
-- Orden corregido para evitar foreign key conflicts
-- ============================================

DO $$
DECLARE
  v_appointments INTEGER;
  v_reserved_slots INTEGER;
  v_unavailable_slots INTEGER;
  v_recurring_blocked INTEGER;
  v_deleted_items INTEGER;
  v_updated_slots INTEGER;
  v_remaining INTEGER;
BEGIN
  -- ============================================
  -- PRE-DELETION COUNTS
  -- ============================================
  SELECT COUNT(*) INTO v_appointments FROM appointments;
  SELECT COUNT(*) INTO v_reserved_slots FROM provider_time_slots WHERE is_reserved = true;
  SELECT COUNT(*) INTO v_unavailable_slots FROM provider_time_slots WHERE is_available = false;
  SELECT COUNT(*) INTO v_recurring_blocked FROM provider_time_slots WHERE recurring_blocked = true;
  
  RAISE NOTICE '=== PRE-DELETION STATE ===';
  RAISE NOTICE 'Total appointments: %', v_appointments;
  RAISE NOTICE 'Reserved slots: %', v_reserved_slots;
  RAISE NOTICE 'Unavailable slots: %', v_unavailable_slots;
  RAISE NOTICE 'Recurring blocked slots: %', v_recurring_blocked;

  -- ============================================
  -- FASE 1: ELIMINACIÓN EN CASCADA (orden correcto)
  -- ============================================
  
  -- 1. Delete post_payment_items (depends on post_payment_invoices)
  DELETE FROM post_payment_items 
  WHERE invoice_id IN (SELECT id FROM post_payment_invoices);
  GET DIAGNOSTICS v_deleted_items = ROW_COUNT;
  RAISE NOTICE 'Deleted post_payment_items: %', v_deleted_items;

  -- 2. Delete post_payment_evidence (depends on appointments)
  DELETE FROM post_payment_evidence 
  WHERE appointment_id IN (SELECT id FROM appointments);
  GET DIAGNOSTICS v_deleted_items = ROW_COUNT;
  RAISE NOTICE 'Deleted post_payment_evidence: %', v_deleted_items;

  -- 3. Delete post_payment_invoices (depends on appointments)
  DELETE FROM post_payment_invoices 
  WHERE appointment_id IN (SELECT id FROM appointments);
  GET DIAGNOSTICS v_deleted_items = ROW_COUNT;
  RAISE NOTICE 'Deleted post_payment_invoices: %', v_deleted_items;

  -- 4. Delete invoices (depends on appointments)
  DELETE FROM invoices 
  WHERE appointment_id IN (SELECT id FROM appointments);
  GET DIAGNOSTICS v_deleted_items = ROW_COUNT;
  RAISE NOTICE 'Deleted invoices: %', v_deleted_items;

  -- 5. Delete provider_ratings (depends on appointments)
  DELETE FROM provider_ratings 
  WHERE appointment_id IN (SELECT id FROM appointments);
  GET DIAGNOSTICS v_deleted_items = ROW_COUNT;
  RAISE NOTICE 'Deleted provider_ratings: %', v_deleted_items;

  -- 6. Delete recurring_exceptions (depends on appointments)
  DELETE FROM recurring_exceptions 
  WHERE appointment_id IN (SELECT id FROM appointments);
  GET DIAGNOSTICS v_deleted_items = ROW_COUNT;
  RAISE NOTICE 'Deleted recurring_exceptions: %', v_deleted_items;

  -- 7. Delete price_history (depends on appointments)
  DELETE FROM price_history 
  WHERE appointment_id IN (SELECT id FROM appointments);
  GET DIAGNOSTICS v_deleted_items = ROW_COUNT;
  RAISE NOTICE 'Deleted price_history: %', v_deleted_items;

  -- 8. DELETE APPOINTMENTS FIRST (before onvopay_payments)
  -- appointments references onvopay_payments, so delete appointments first
  DELETE FROM appointments;
  GET DIAGNOSTICS v_deleted_items = ROW_COUNT;
  RAISE NOTICE 'Deleted appointments: %', v_deleted_items;

  -- 9. Now safe to delete onvopay_payments (no more appointments referencing it)
  DELETE FROM onvopay_payments;
  GET DIAGNOSTICS v_deleted_items = ROW_COUNT;
  RAISE NOTICE 'Deleted onvopay_payments: %', v_deleted_items;
  
  RAISE NOTICE '✅ Fase 1 completada: Todas las appointments y dependencias eliminadas';

  -- ============================================
  -- FASE 2: RESET COMPLETO DE SLOTS
  -- ============================================
  
  UPDATE provider_time_slots
  SET 
    is_reserved = false,
    is_available = true,
    recurring_blocked = false,
    recurring_rule_id = NULL,
    blocked_until = NULL,
    slot_type = 'generated'
  WHERE is_reserved = true 
     OR is_available = false 
     OR recurring_blocked = true
     OR recurring_rule_id IS NOT NULL
     OR blocked_until IS NOT NULL;
  
  GET DIAGNOSTICS v_updated_slots = ROW_COUNT;
  RAISE NOTICE 'Updated slots to available: %', v_updated_slots;
  RAISE NOTICE '✅ Fase 2 completada: Todos los slots reseteados';

  -- ============================================
  -- FASE 3: LIMPIEZA DE DATOS HUÉRFANOS
  -- ============================================
  
  -- Clean ALL recurring rules (no appointments exist anymore)
  DELETE FROM recurring_appointment_instances;
  GET DIAGNOSTICS v_deleted_items = ROW_COUNT;
  RAISE NOTICE 'Deleted all recurring_instances: %', v_deleted_items;

  DELETE FROM recurring_rules;
  GET DIAGNOSTICS v_deleted_items = ROW_COUNT;
  RAISE NOTICE 'Deleted all recurring_rules: %', v_deleted_items;

  -- Clean ALL onvopay_subscriptions (no appointments exist anymore)
  DELETE FROM onvopay_subscriptions;
  GET DIAGNOSTICS v_deleted_items = ROW_COUNT;
  RAISE NOTICE 'Deleted all onvopay_subscriptions: %', v_deleted_items;

  -- Clean onvopay webhooks
  DELETE FROM onvopay_webhooks;
  GET DIAGNOSTICS v_deleted_items = ROW_COUNT;
  RAISE NOTICE 'Deleted all onvopay_webhooks: %', v_deleted_items;
  
  RAISE NOTICE '✅ Fase 3 completada: Datos huérfanos eliminados';

  -- ============================================
  -- FASE 4: VERIFICACIÓN FINAL
  -- ============================================
  
  SELECT COUNT(*) INTO v_remaining FROM appointments;
  RAISE NOTICE 'Remaining appointments: % (expected: 0)', v_remaining;
  
  SELECT COUNT(*) INTO v_remaining FROM provider_time_slots WHERE is_available = false;
  RAISE NOTICE 'Unavailable slots: % (expected: 0)', v_remaining;
  
  SELECT COUNT(*) INTO v_remaining FROM provider_time_slots WHERE is_reserved = true;
  RAISE NOTICE 'Reserved slots: % (expected: 0)', v_remaining;
  
  SELECT COUNT(*) INTO v_remaining FROM provider_time_slots WHERE recurring_blocked = true;
  RAISE NOTICE 'Recurring blocked slots: % (expected: 0)', v_remaining;
  
  SELECT COUNT(*) INTO v_remaining FROM invoices;
  RAISE NOTICE 'Orphaned invoices: % (expected: 0)', v_remaining;
  
  SELECT COUNT(*) INTO v_remaining FROM provider_ratings;
  RAISE NOTICE 'Orphaned ratings: % (expected: 0)', v_remaining;
  
  SELECT COUNT(*) INTO v_remaining FROM onvopay_payments;
  RAISE NOTICE 'Remaining onvopay_payments: % (expected: 0)', v_remaining;
  
  SELECT COUNT(*) INTO v_remaining FROM recurring_rules;
  RAISE NOTICE 'Remaining recurring_rules: % (expected: 0)', v_remaining;
  
  SELECT COUNT(*) INTO v_remaining FROM recurring_appointment_instances;
  RAISE NOTICE 'Remaining recurring_instances: % (expected: 0)', v_remaining;
  
  SELECT COUNT(*) INTO v_remaining FROM onvopay_subscriptions;
  RAISE NOTICE 'Remaining subscriptions: % (expected: 0)', v_remaining;
  
  RAISE NOTICE '✅ SISTEMA COMPLETAMENTE LIMPIO Y LISTO PARA NUEVAS RESERVAS';
END $$;