import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const tabs = [
  { label: 'Dashboard', path: '/admin/dashboard' },
  { label: 'Citas', path: '/admin/appointments' },
  { label: 'Clientes', path: '/admin/clients' },
  { label: 'Proveedores', path: '/admin/providers' },
];

export const AdminTabs = () => {
  const location = useLocation();

  return (
    <div className="bg-card border-b border-border">
      <div className="container mx-auto px-4">
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                'px-6 py-3 text-sm font-medium transition-colors hover:text-primary',
                location.pathname === tab.path
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground'
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
};
