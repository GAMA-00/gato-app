import { supabase } from '@/integrations/supabase/client';

export const debugRecurringSystem = async (providerId: string) => {
  console.log('🔍 === DEBUGGING RECURRING SYSTEM ===');
  console.log(`Provider ID: ${providerId}`);
  
  // 1. Check appointments with recurrence
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('provider_id', providerId)
    .not('recurrence', 'is', null)
    .neq('recurrence', 'none')
    .order('start_time', { ascending: true });
    
  console.log(`📋 Found ${appointments?.length || 0} appointments with recurrence`);
  appointments?.forEach(app => {
    console.log(`  - ${app.client_name}: ${app.start_time} (${app.recurrence}, status: ${app.status}, rule_id: ${app.recurring_rule_id})`);
  });
  
  // 2. Check recurring rules
  const { data: rules } = await supabase
    .from('recurring_rules')
    .select('*')
    .eq('provider_id', providerId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });
    
  console.log(`📋 Found ${rules?.length || 0} active recurring rules`);
  rules?.forEach(rule => {
    console.log(`  - ${rule.client_name}: ${rule.recurrence_type} from ${rule.start_date} (${rule.start_time}-${rule.end_time})`);
  });
  
  // 3. Check for orphaned rules
  const orphanedRules = rules?.filter(rule => 
    !appointments?.some(app => app.recurring_rule_id === rule.id)
  );
  
  if (orphanedRules?.length) {
    console.log(`⚠️ Found ${orphanedRules.length} orphaned recurring rules:`);
    orphanedRules.forEach(rule => {
      console.log(`  - ${rule.client_name}: ${rule.recurrence_type} (no linked appointments)`);
    });
  }
  
  // 4. Check for appointments without rules
  const appointmentsWithoutRules = appointments?.filter(app => 
    app.recurrence !== 'none' && !app.recurring_rule_id
  );
  
  if (appointmentsWithoutRules?.length) {
    console.log(`⚠️ Found ${appointmentsWithoutRules.length} recurring appointments without rules:`);
    appointmentsWithoutRules.forEach(app => {
      console.log(`  - ${app.client_name}: ${app.start_time} (${app.recurrence}, no rule_id)`);
    });
  }
  
  console.log('🔍 === END DEBUGGING ===');
  
  return {
    appointments,
    rules,
    orphanedRules,
    appointmentsWithoutRules
  };
};

export const cleanupRecurringSystem = async (providerId: string) => {
  console.log('🧹 === CLEANING UP RECURRING SYSTEM ===');
  
  // Get debug info first
  const debugInfo = await debugRecurringSystem(providerId);
  
  let cleanupActions = [];
  
  // 1. Remove orphaned recurring rules
  if (debugInfo.orphanedRules?.length) {
    console.log(`🧹 Removing ${debugInfo.orphanedRules.length} orphaned rules`);
    const { error } = await supabase
      .from('recurring_rules')
      .delete()
      .in('id', debugInfo.orphanedRules.map(r => r.id));
      
    if (error) {
      console.error('Error removing orphaned rules:', error);
    } else {
      cleanupActions.push(`Removed ${debugInfo.orphanedRules.length} orphaned recurring rules`);
    }
  }
  
  // 2. Fix appointments without recurring_rule_id
  if (debugInfo.appointmentsWithoutRules?.length) {
    console.log(`🧹 Fixing ${debugInfo.appointmentsWithoutRules.length} appointments without rule IDs`);
    for (const app of debugInfo.appointmentsWithoutRules) {
      // Set recurrence to 'none' for these appointments
      const { error } = await supabase
        .from('appointments')
        .update({ recurrence: 'none' })
        .eq('id', app.id);
        
      if (error) {
        console.error(`Error fixing appointment ${app.id}:`, error);
      } else {
        cleanupActions.push(`Fixed appointment ${app.id} (${app.client_name})`);
      }
    }
  }
  
  console.log('🧹 === CLEANUP COMPLETE ===');
  console.log('Actions taken:', cleanupActions);
  
  return cleanupActions;
};