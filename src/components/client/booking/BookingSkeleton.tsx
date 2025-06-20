
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const BookingSkeleton = () => (
  <Card>
    <CardContent className="p-4">
      <div className="flex flex-col space-y-3">
        <div className="flex justify-between items-start">
          <Skeleton className="h-6 w-3/5" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
        </div>
      </div>
    </CardContent>
  </Card>
);
