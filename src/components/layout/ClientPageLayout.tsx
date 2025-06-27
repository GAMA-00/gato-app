
import React from 'react';
import { cn } from '@/lib/utils';
import Navbar from './Navbar';

interface ClientPageLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

const ClientPageLayout = ({ children, title, subtitle, className }: ClientPageLayoutProps) => {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#FAFAFA]">
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
          <div className={cn("max-w-6xl mx-auto", className)}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export default ClientPageLayout;
