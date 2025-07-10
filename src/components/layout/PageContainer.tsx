
import React from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

const PageContainer = ({ children, title, subtitle, className }: PageContainerProps) => {
  return (
    <div className={cn("min-h-screen bg-[#FAFAFA] pt-16 pb-20 md:pt-0 md:pb-0", className)}>
      <div className="md:ml-52 p-4 md:p-6">
        {(title || subtitle) && (
          <div className="mb-6">
            {title && (
              <h1 className="text-2xl font-semibold text-[#2D2D2D] mb-2">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-sm text-[#6B6B6B]">
                {subtitle}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export default PageContainer;
