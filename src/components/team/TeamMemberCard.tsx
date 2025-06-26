
import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, User, Phone, IdCard, FileCheck } from 'lucide-react';
import { TeamMember } from '@/lib/teamTypes';
import TeamMemberModal from './TeamMemberModal';

interface TeamMemberCardProps {
  member: TeamMember;
  onEdit: (member: TeamMember) => void;
  onDelete: (memberId: string) => void;
  isProvider?: boolean;
}

const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
  member,
  onEdit,
  onDelete,
  isProvider = false
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getRoleDisplay = (member: TeamMember) => {
    if (member.role === 'lider') return 'Líder del equipo';
    return `Auxiliar ${member.positionOrder}`;
  };

  return (
    <>
      <Card className="h-full">
        <CardHeader className="text-center pb-2">
          <Avatar className="w-16 h-16 mx-auto mb-2">
            <AvatarImage src={member.photoUrl} alt={member.name} />
            <AvatarFallback className="bg-blue-100 text-blue-600">
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>
          <h3 className="font-medium text-sm">{member.name}</h3>
          <Badge 
            variant={member.role === 'lider' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {getRoleDisplay(member)}
          </Badge>
        </CardHeader>
        
        <CardContent className="pt-2 space-y-3">
          {!isProvider && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowDetails(true)}
            >
              Ver más detalles
            </Button>
          )}
          
          {isProvider && member.role !== 'lider' && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onEdit(member)}
              >
                <Edit className="w-3 h-3 mr-1" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-destructive hover:text-destructive"
                onClick={() => onDelete(member.id)}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Eliminar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de detalles para clientes */}
      {showDetails && (
        <TeamMemberModal
          isOpen={showDetails}
          onClose={() => setShowDetails(false)}
          member={member}
          mode="view"
        />
      )}
    </>
  );
};

export default TeamMemberCard;
