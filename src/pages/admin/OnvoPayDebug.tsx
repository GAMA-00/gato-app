import React from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { OnvoPayDebugPanel } from '@/components/admin/OnvoPayDebugPanel';

export const OnvoPayDebug = () => {
  return (
    <PageLayout>
      <div className="container mx-auto py-8 px-4">
        <OnvoPayDebugPanel />
      </div>
    </PageLayout>
  );
};