
import React from 'react';
import { cn } from '@/lib/utils';
import Navbar from './Navbar';

interface ClientPageLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string | React.ReactNode;
  className?: string;
}

const ClientPageLayout = ({ children, title, subtitle, className }: ClientPageLayoutProps) => {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#FAFAFA] pt-14 pb-20 md:pt-0 md:pb-0">
        <div className="md:ml-52 px-4 pt-3 pb-4 md:p-6">
          {(title || subtitle) && (
            <div className="mb-6">
              {title && (
                <h1 className="text-2xl font-semibold text-[#2D2D2D] mb-2">
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
          <div className={cn("max-w-6xl mx-auto", className)}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export default ClientPageLayout;
