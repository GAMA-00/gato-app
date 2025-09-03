import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePendingInvoices } from '@/hooks/usePostPaymentInvoices';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, DollarSign } from 'lucide-react';
import PostPaymentInvoicing from '@/components/provider/PostPaymentInvoicing';

interface PostPaymentGateProps {
  children: React.ReactNode;
}

const PostPaymentGate: React.FC<PostPaymentGateProps> = ({ children }) => {
  // Always show normal content - notifications are handled in navigation
  return <>{children}</>;
};

export default PostPaymentGate;