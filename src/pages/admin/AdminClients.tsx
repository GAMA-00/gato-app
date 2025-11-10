import { useState } from 'react';
import { AdminUsersTable } from '@/components/admin/users/AdminUsersTable';
import { SearchBar } from '@/components/admin/common/SearchBar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminClients() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-foreground">Clientes</h2>
      <Card>
        <CardHeader>
          <CardTitle>Todos los clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <SearchBar
              placeholder="Buscar cliente por nombre..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>
          <AdminUsersTable role="client" searchQuery={searchQuery} />
        </CardContent>
      </Card>
    </div>
  );
}
