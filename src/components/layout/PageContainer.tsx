
import React from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface PageContainerProps {
  children: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

const PageContainer: React.FC<PageContainerProps> = ({
  children,
  title,
  subtitle,
  action,
  className
}) => {
  const isMobile = useIsMobile();
  
  return (
    <div className={cn(
      isMobile ? "pt-0 pb-24" : "pl-64 pt-0", // Padding superior eliminado
      "min-h-screen w-full overflow-y-auto bg-white",
      className
    )}>
      <div className={cn("p-2 md:p-6 max-w-7xl animate-fade-in")}>
        <div className={cn("flex flex-col md:flex-row md:items-center justify-between mb-2 md:mb-3 gap-1")}>
          {/* Reducido aún más el margin-bottom y gap */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-0 text-app-text">{title}</h1>
            {subtitle && <div className="text-app-text/70 text-lg">{subtitle}</div>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
        <div className="animate-slide-up pb-12">
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageContainer;
