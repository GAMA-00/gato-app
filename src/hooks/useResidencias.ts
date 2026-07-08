
import { Residencia } from '@/lib/types';

// v1: el modelo de residencias/condominios quedó obsoleto (se usa cantón).
// Neutralizado: devuelve listas vacías sin consultar tablas muertas.
export function useResidencias() {
  const residencias: Residencia[] = [];
  return { residencias, isLoading: false, error: null as Error | null };
}

export function useCondominiums(_residenciaId: string | undefined) {
  const condominiums: any[] = [];
  return { condominiums, isLoading: false, error: null as Error | null };
}
