import React from 'react';
import { Calendar, Users, DollarSign, UserPlus, Car, Star } from 'lucide-react';
import { DashboardStats } from '@/lib/types';
import { useTravelInsights } from '@/hooks/useTravelInsights';

interface ProviderStatsCardsProps {
  stats?: DashboardStats;
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
    <div className="bg-muted/40 rounded-xl p-3 flex flex-col items-center text-center min-w-0">
      <div className="text-primary mb-0.5">
        {icon}
      </div>
      <span className="text-xs text-muted-foreground font-medium leading-tight">{label}</span>
      <span className="text-xl font-bold text-foreground mt-0.5 leading-tight">{value}</span>
      <span className="text-xs text-muted-foreground leading-tight">{sublabel}</span>
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
        value={`₡${(stats?.monthRevenue ?? 0).toLocaleString('es-CR')}`}
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
      <StatCard
        icon={<Star className="h-5 w-5" />}
        label="Semana"
        value={stats?.weekAppointments ?? 0}
        sublabel="Citas"
      />
    </div>
  );
};

export default ProviderStatsCards;
