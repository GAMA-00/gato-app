
import React from 'react';
import { format } from 'date-fns';
import { Edit, Mail, Phone, MapPin, Trash } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Client } from '@/lib/types';

interface ClientCardProps {
  client: Client;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
}

const ClientCard: React.FC<ClientCardProps> = ({
  client,
  onEdit,
  onDelete
}) => {
  return (
    <Card className="glassmorphism overflow-hidden group transition-all duration-300 hover:shadow-medium">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="font-medium text-primary">
              {client.name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
          
          <div className="flex-grow">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">{client.name}</h3>
                <p className="text-xs text-muted-foreground">
                  Cliente desde {format(client.createdAt, 'MMM yyyy')}
                </p>
              </div>
              
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" onClick={() => onEdit(client)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(client)}>
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="grid gap-2 mt-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{client.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{client.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{client.address}</span>
              </div>
            </div>
            
            {client.notes && (
              <div className="mt-3 p-2 bg-muted/50 rounded-md text-sm">
                <p className="text-muted-foreground">{client.notes}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientCard;
