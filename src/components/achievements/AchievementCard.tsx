
import React from 'react';
import { Award, Star, CheckCircle, Share2, Shield, Trophy, User, Users, Zap, Calendar, Repeat } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Achievement } from '@/lib/types';

// Map of icons for different achievement types
const iconMap: Record<string, React.ReactNode> = {
  'user': <User className="h-5 w-5" />,
  'shield': <Shield className="h-5 w-5" />,
  'star': <Star className="h-5 w-5" />,
  'award': <Award className="h-5 w-5" />,
  'check-circle': <CheckCircle className="h-5 w-5" />,
  'share': <Share2 className="h-5 w-5" />,
  'milestone': <Trophy className="h-5 w-5" />,
  'calendar-check': <Calendar className="h-5 w-5" />,
  'repeat': <Repeat className="h-5 w-5" />,
  'zap': <Zap className="h-5 w-5" />,
  'users': <Users className="h-5 w-5" />,
};

const AchievementCard: React.FC<{ achievement: Achievement }> = ({ achievement }) => {
  const completionCount = achievement.completionCount || 0;
  const isCompleted = completionCount > 0;
  
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value={achievement.id} className="border-b">
        <AccordionTrigger className="hover:no-underline py-4">
          <div className="flex items-center gap-4 w-full">
            <div className={`p-2 rounded-full ${isCompleted ? 'bg-primary/20' : 'bg-muted'}`}>
              {iconMap[achievement.icon] || <Trophy className="h-5 w-5" />}
            </div>
            <div className="flex flex-1 items-center justify-between">
              <div>
                <h3 className="font-medium text-left">{achievement.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 text-left">{achievement.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="ml-auto">
                  {achievement.points} pts
                </Badge>
                {isCompleted && (
                  <Badge className="bg-amber-500 text-white">
                    x{completionCount}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-12">
          <div className="space-y-4">
            {isCompleted ? (
              <div className="space-y-3">
                <h4 className="font-medium">Completado {completionCount} {completionCount === 1 ? 'vez' : 'veces'}</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Puntos Ganados</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: completionCount }).map((_, index) => {
                      const date = new Date(achievement.completedAt || new Date());
                      date.setDate(date.getDate() - (index * 15));
                      
                      return (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{date.toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">{achievement.points}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="flex justify-between text-sm">
                  <span>Total puntos: {achievement.points * completionCount}</span>
                  <span className="text-primary cursor-pointer hover:underline">
                    Consigue de nuevo
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>Aún no has completado este logro</p>
                <Button className="mt-2">
                  Completar ahora
                </Button>
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default AchievementCard;
