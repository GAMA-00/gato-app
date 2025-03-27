
import React from 'react';
import { Calendar, Clock, DollarSign, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardStats as DashboardStatsType } from '@/lib/types';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  description,
  trend
}) => {
  return (
    <Card className="glassmorphism overflow-hidden transition-all duration-300 hover:shadow-medium">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <h3 className="text-2xl font-semibold">{value}</h3>
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                <span className={trend.isPositive ? "text-green-500" : "text-red-500"}>
                  {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
                </span>
                <span className="text-xs text-muted-foreground">vs last period</span>
              </div>
            )}
          </div>
          <div className="p-3 rounded-full bg-primary/10">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface DashboardStatsProps {
  stats: DashboardStatsType;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Today's Appointments"
        value={stats.todayAppointments}
        icon={<Calendar className="h-5 w-5 text-primary" />}
        description="Scheduled for today"
        trend={{ value: 12, isPositive: true }}
      />
      <StatCard
        title="This Week"
        value={stats.weekAppointments}
        icon={<Clock className="h-5 w-5 text-primary" />}
        description="Upcoming appointments"
        trend={{ value: 8, isPositive: true }}
      />
      <StatCard
        title="Monthly Revenue"
        value={`$${stats.monthRevenue.toLocaleString()}`}
        icon={<DollarSign className="h-5 w-5 text-primary" />}
        description="For current month"
        trend={{ value: 5, isPositive: true }}
      />
      <StatCard
        title="Active Clients"
        value={stats.activeClients}
        icon={<Users className="h-5 w-5 text-primary" />}
        description="Total active clients"
        trend={{ value: 3, isPositive: true }}
      />
    </div>
  );
};

export default DashboardStats;
