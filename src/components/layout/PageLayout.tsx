import React from 'react';
import { cn } from '@/lib/utils';
import Navbar from './Navbar';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string | React.ReactNode;
  className?: string;
  contentClassName?: string;
}

const PageLayout = ({ 
  children, 
  title, 
  subtitle, 
  className, 
  contentClassName 
}: PageLayoutProps) => {
  return (
    <>
      <Navbar />
      <div className={cn("min-h-screen bg-[#FAFAFA] pt-16 pb-20 md:pt-0 md:pb-0", className)}>
        <div className="md:ml-52 p-4 md:p-6">
          {(title || subtitle) && (
            <div className="mb-6">
              {title && (
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#2D2D2D] mb-2">
                  {title}
                </h1>
              )}
              {subtitle && (
                <div className="text-sm text-[#6B6B6B]">
                  {subtitle}
                </div>
              )}
            </div>
          )}
          <div className={cn("max-w-6xl mx-auto", contentClassName)}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export default PageLayout;