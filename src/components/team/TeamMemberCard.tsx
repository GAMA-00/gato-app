
import React, { useState } from 'react';
import UnifiedAvatar from '@/components/ui/unified-avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, User, Phone, IdCard, FileCheck } from 'lucide-react';
import { TeamMember } from '@/lib/teamTypes';
import TeamMemberModal from './TeamMemberModal';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();

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
        <CardHeader className={`text-center ${isMobile ? "pb-3 px-3 pt-4" : "pb-2"}`}>
          <UnifiedAvatar 
            src={member.photoUrl} 
            name={member.name}
            size={isMobile ? "md" : "lg"}
            className={`mx-auto ${isMobile ? "mb-2" : "mb-2"}`}
            onError={() => console.error('TeamMemberCard: Failed to load photo for:', member.name)}
            onLoad={() => console.log('TeamMemberCard: Successfully loaded photo for:', member.name)}
          />
          <h3 className={`font-medium ${isMobile ? "text-sm leading-tight px-1" : "text-sm"}`}>
            {member.name}
          </h3>
          <Badge 
            variant={member.role === 'lider' ? 'default' : 'secondary'}
            className={isMobile ? "text-xs px-2 py-1" : "text-xs"}
          >
            {getRoleDisplay(member)}
          </Badge>
        </CardHeader>
        
        <CardContent className={`${isMobile ? "pt-2 px-3 pb-4" : "pt-2"} space-y-3`}>
          {!isProvider && (
            <Button
              variant="outline"
              size="sm"
              className={`w-full ${isMobile ? "text-sm py-2" : ""}`}
              onClick={() => setShowDetails(true)}
            >
              Ver más detalles
            </Button>
          )}
          
          {isProvider && member.role !== 'lider' && (
            <div className={`flex ${isMobile ? "gap-2" : "gap-2"}`}>
              <Button
                variant="outline"
                size="sm"
                className={`flex-1 ${isMobile ? "text-xs px-2 py-2" : ""}`}
                onClick={() => onEdit(member)}
              >
                <Edit className={`${isMobile ? "w-3 h-3 mr-1" : "w-3 h-3 mr-1"}`} />
                <span>{isMobile ? "Editar" : "Editar"}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`flex-1 text-destructive hover:text-destructive ${isMobile ? "text-xs px-2 py-2" : ""}`}
                onClick={() => onDelete(member.id)}
              >
                <Trash2 className={`${isMobile ? "w-3 h-3 mr-1" : "w-3 h-3 mr-1"}`} />
                <span>{isMobile ? "Eliminar" : "Eliminar"}</span>
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
          providerId={member.providerId}
        />
      )}
    </>
  );
};

export default TeamMemberCard;
