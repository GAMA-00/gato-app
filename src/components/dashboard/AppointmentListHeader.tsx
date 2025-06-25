
import React from 'react';
import { ExternalLink } from 'lucide-react';
import { CardHeader, CardTitle } from '@/components/ui/card';

interface AppointmentListHeaderProps {
  title: string;
  icon?: React.ReactNode;
  appointmentCount: number;
  externalCount: number;
}

const AppointmentListHeader: React.FC<AppointmentListHeaderProps> = ({
  title,
  icon,
  appointmentCount,
  externalCount
}) => {
  return (
    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
      <CardTitle className="text-xl flex items-center flex-1 min-w-0 pr-8">
        {icon}
        <span className="truncate">{title}</span>
      </CardTitle>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full whitespace-nowrap">
          {appointmentCount} citas
        </span>
        {/* Show external bookings count if any */}
        {externalCount > 0 && (
          <span className="text-sm bg-blue-50 text-blue-600 px-2 py-1 rounded-full flex items-center gap-1 whitespace-nowrap">
            <ExternalLink className="h-3 w-3" />
            {externalCount} externa{externalCount > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </CardHeader>
  );
};

export default AppointmentListHeader;
