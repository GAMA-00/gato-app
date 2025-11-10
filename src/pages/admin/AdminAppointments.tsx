import { useState } from 'react';
import { AdminAppointmentsTable } from '@/components/admin/appointments/AdminAppointmentsTable';
import { SearchBar } from '@/components/admin/common/SearchBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminAppointments() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-foreground">Citas</h2>
      <Card>
        <CardHeader>
          <CardTitle>Todas las citas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <SearchBar
              placeholder="Buscar por ID, cliente o proveedor..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>
          <AdminAppointmentsTable searchQuery={searchQuery} />
        </CardContent>
      </Card>
    </div>
  );
}
