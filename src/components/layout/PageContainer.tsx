
import React from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
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
  return (
    <div className={cn("pl-64 min-h-screen", className)}>
      <div className="p-8 max-w-7xl animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight mb-1">{title}</h1>
            {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
        <div className="animate-slide-up">
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageContainer;
