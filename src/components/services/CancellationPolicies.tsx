
import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Info } from 'lucide-react';

const cancellationPolicies = [
  { timeFrame: 'Más de 24 horas', refund: 'Cancelación gratuita' },
  { timeFrame: 'Entre 2 y 24 horas', refund: 'Multa del 20%' },
  { timeFrame: 'Menos de 2 horas', refund: 'Multa del 50%' },
];

const CancellationPolicies: React.FC = () => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5 text-muted-foreground" />
          Política de cancelación
        </CardTitle>
        <CardDescription>
          Conoce los términos de cancelación y reembolso para este servicio
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Antelación al inicio</TableHead>
              <TableHead>% de reembolso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cancellationPolicies.map((policy) => (
              <TableRow key={policy.timeFrame}>
                <TableCell>{policy.timeFrame}</TableCell>
                <TableCell>{policy.refund}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default CancellationPolicies;
