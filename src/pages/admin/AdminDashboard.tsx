import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StatsCard } from '@/components/admin/dashboard/StatsCard';
import { Users, Calendar, DollarSign } from 'lucide-react';

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [usersRes, appointmentsRes, paymentsRes, offsetsRes] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('appointments').select('id', { count: 'exact', head: true }),
        supabase.from('onvopay_payments').select('amount').eq('status', 'captured'),
        supabase.from('admin_stat_offsets').select('stat_name, offset_value'),
      ]);

      const totalRevenue = paymentsRes.data?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
      
      // Get offsets for resetting counters
      const offsets = offsetsRes.data || [];
      const appointmentsOffset = offsets.find(o => o.stat_name === 'total_appointments')?.offset_value || 0;
      const revenueOffset = offsets.find(o => o.stat_name === 'total_revenue')?.offset_value || 0;

      return {
        totalUsers: usersRes.count || 0,
        totalAppointments: Math.max(0, (appointmentsRes.count || 0) - Number(appointmentsOffset)),
        totalRevenue: Math.max(0, totalRevenue - Number(revenueOffset)),
      };
    },
  });

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Total Usuarios"
          value={stats?.totalUsers || 0}
          icon={<Users className="w-6 h-6" />}
        />
        <StatsCard
          title="Total Citas"
          value={stats?.totalAppointments || 0}
          icon={<Calendar className="w-6 h-6" />}
        />
        <StatsCard
          title="Ingresos Totales"
          value={`$${(stats?.totalRevenue || 0).toFixed(2)}`}
          icon={<DollarSign className="w-6 h-6" />}
        />
      </div>
    </div>
  );
}
