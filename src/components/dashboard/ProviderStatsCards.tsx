import React from 'react';
import { Calendar, Users, DollarSign, UserPlus, Car } from 'lucide-react';
import { DashboardStats as DashboardStatsType } from '@/lib/types';
import { useTravelInsights } from '@/hooks/useTravelInsights';

interface ProviderStatsCardsProps {
  stats?: DashboardStatsType;
  isLoading?: boolean;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sublabel: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, sublabel }) => {
  return (
    <div className="bg-muted/40 rounded-xl p-4 flex flex-col items-center text-center min-w-0">
      <div className="text-primary mb-1">
        {icon}
      </div>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <span className="text-2xl font-bold text-foreground mt-1">{value}</span>
      <span className="text-xs text-muted-foreground">{sublabel}</span>
    </div>
  );
};

const ProviderStatsCards: React.FC<ProviderStatsCardsProps> = ({ stats, isLoading }) => {
  // Métricas del nuevo concepto (clientes nuevos + tiempo en traslados)
  const { data: insights } = useTravelInsights();

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-muted/40 rounded-xl p-4 h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      <StatCard
        icon={<Calendar className="h-5 w-5" />}
        label="Este mes"
        value={stats?.monthAppointments ?? 0}
        sublabel="Citas"
      />
      <StatCard
        icon={<Users className="h-5 w-5" />}
        label="Recurrentes"
        value={stats?.activeClients ?? 0}
        sublabel="Clientes"
      />
      <StatCard
        icon={<DollarSign className="h-5 w-5" />}
        label="Ingresos"
        value={`$${(stats?.monthRevenue ?? 0).toLocaleString()}`}
        sublabel="Este mes"
      />
      <StatCard
        icon={<UserPlus className="h-5 w-5" />}
        label="Nuevos"
        value={insights?.newClientsThisMonth ?? 0}
        sublabel="Este mes"
      />
      <StatCard
        icon={<Car className="h-5 w-5" />}
        label="Traslados"
        value={`${insights?.travelTimeHoursThisWeek ?? 0}h`}
        sublabel="Esta semana"
      />
    </div>
  );
};

export default ProviderStatsCards;
