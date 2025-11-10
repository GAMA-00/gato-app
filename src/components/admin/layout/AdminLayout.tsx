import { AdminTopBar } from './AdminTopBar';
import { AdminTabs } from './AdminTabs';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => (
  <div className="min-h-screen bg-background">
    <AdminTopBar />
    <AdminTabs />
    <main className="container mx-auto px-4 py-6">{children}</main>
  </div>
);
