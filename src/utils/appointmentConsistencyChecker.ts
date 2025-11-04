/**
 * APPOINTMENT CONSISTENCY CHECKER
 * ================================
 * 
 * Utility to verify that appointments appear consistently across all views:
 * - Client bookings view
 * - Provider dashboard
 * - Provider calendar
 * 
 * Run this periodically to detect and log inconsistencies.
 */

import { supabase } from '@/integrations/supabase/client';

export interface ConsistencyIssue {
  issue_type: string;
  issue_count: number;
  details: string;
}

export interface ConsistencyCheckResult {
  isConsistent: boolean;
  issues: ConsistencyIssue[];
  timestamp: string;
  totalAppointments: number;
  unifiedAppointments: number;
}

/**
 * Performs comprehensive consistency check on appointment data
 */
export async function checkAppointmentConsistency(): Promise<ConsistencyCheckResult> {
  console.log('🔍 Running appointment consistency check...');
  
  try {
    // 1. Call DB function to check for common issues
    const { data: dbIssues, error: dbError } = await supabase
      .rpc('check_appointment_consistency');
    
    if (dbError) {
      console.error('Error checking consistency:', dbError);
      throw dbError;
    }
    
    const issues: ConsistencyIssue[] = (dbIssues || []).map((issue: any) => ({
      issue_type: issue.issue_type,
      issue_count: Number(issue.issue_count),
      details: issue.details
    }));
    
    // 2. Count total appointments
    const { count: totalCount, error: countError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '(cancelled,rejected)');
    
    if (countError) throw countError;
    
    // 3. Count unified appointments
    const { count: unifiedCount, error: unifiedError } = await supabase
      .from('unified_appointments')
      .select('*', { count: 'exact', head: true });
    
    if (unifiedError) throw unifiedError;
    
    // 4. Check for critical issues
    const hasCriticalIssues = issues.some(issue => 
      issue.issue_count > 0 && 
      ['scheduled_status_found', 'missing_audit_trail'].includes(issue.issue_type)
    );
    
    // 5. Log results
    const result: ConsistencyCheckResult = {
      isConsistent: !hasCriticalIssues && issues.every(i => i.issue_count === 0),
      issues,
      timestamp: new Date().toISOString(),
      totalAppointments: totalCount || 0,
      unifiedAppointments: unifiedCount || 0
    };
    
    if (result.isConsistent) {
      console.log('✅ Appointment data is CONSISTENT');
    } else {
      console.warn('⚠️ Appointment data has INCONSISTENCIES:');
      issues.forEach(issue => {
        if (issue.issue_count > 0) {
          console.warn(`  - ${issue.issue_type}: ${issue.issue_count} issues - ${issue.details}`);
        }
      });
    }
    
    console.log(`📊 Total appointments: ${result.totalAppointments}`);
    console.log(`📊 Unified view count: ${result.unifiedAppointments}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error running consistency check:', error);
    throw error;
  }
}

/**
 * Logs inconsistencies to console with detailed formatting
 */
export function logConsistencyReport(result: ConsistencyCheckResult) {
  console.log('\n' + '='.repeat(60));
  console.log('📋 APPOINTMENT CONSISTENCY REPORT');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${new Date(result.timestamp).toLocaleString()}`);
  console.log(`Status: ${result.isConsistent ? '✅ CONSISTENT' : '⚠️ INCONSISTENT'}`);
  console.log(`Total Appointments: ${result.totalAppointments}`);
  console.log(`Unified View Count: ${result.unifiedAppointments}`);
  console.log('-'.repeat(60));
  
  if (result.issues.length === 0) {
    console.log('No issues found.');
  } else {
    console.log('Issues Found:');
    result.issues.forEach((issue, index) => {
      console.log(`\n${index + 1}. ${issue.issue_type.toUpperCase()}`);
      console.log(`   Count: ${issue.issue_count}`);
      console.log(`   Details: ${issue.details}`);
    });
  }
  
  console.log('='.repeat(60) + '\n');
}

/**
 * Run consistency check and return formatted report
 */
export async function runConsistencyCheckWithReport(): Promise<{
  result: ConsistencyCheckResult;
  report: string;
}> {
  const result = await checkAppointmentConsistency();
  
  const report = `
APPOINTMENT CONSISTENCY REPORT
==============================
Timestamp: ${new Date(result.timestamp).toLocaleString()}
Status: ${result.isConsistent ? 'CONSISTENT ✅' : 'INCONSISTENT ⚠️'}
Total Appointments: ${result.totalAppointments}
Unified View Count: ${result.unifiedAppointments}

${result.issues.length === 0 ? 'No issues found.' : 'Issues Found:\n' + result.issues.map((issue, i) => 
  `${i + 1}. ${issue.issue_type.toUpperCase()}\n   Count: ${issue.issue_count}\n   Details: ${issue.details}`
).join('\n\n')}
`;
  
  return { result, report };
}
