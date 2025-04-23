
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
  { timeFrame: 'Hasta 24 horas', refund: 'Cancelación gratuita' },
  { timeFrame: 'De 24h a 4h', refund: '75% del importe' },
  { timeFrame: 'De 4h a 45min', refund: '50% del importe' },
  { timeFrame: 'De 45min a inicio', refund: '35% del importe' },
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
