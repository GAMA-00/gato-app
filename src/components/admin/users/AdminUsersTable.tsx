import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const PAGE_SIZE = 25;

interface AdminUsersTableProps {
  role: 'client' | 'provider';
  searchQuery: string;
}

export const AdminUsersTable = ({ role, searchQuery }: AdminUsersTableProps) => {
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();

  const toggleActiveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('toggle_user_active', {
        _user_id: userId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Usuario actualizado correctamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar usuario');
    }
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', role, searchQuery, page],
    queryFn: async () => {
      let query = supabase
        .from('users')
        .select('id, name, email, phone, created_at, is_active', { count: 'exact' })
        .eq('role', role)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return { users: data, total: count };
    },
  });

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Cargando...</div>;
  }

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Fecha de registro</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.users?.map((user: any) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phone || '—'}</TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleDateString('es-CR')}
                </TableCell>
                <TableCell>
                  <Badge variant={user.is_active ? "default" : "secondary"}>
                    {user.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActiveMutation.mutate(user.id)}
                    disabled={toggleActiveMutation.isPending}
                  >
                    {user.is_active ? 'Desactivar' : 'Activar'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Página {page + 1} de {totalPages} • Total: {data?.total || 0} usuarios
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages - 1}
          >
            Siguiente
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
