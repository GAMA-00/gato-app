
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDuration } from '@/lib/utils';
import { ServiceCategoryGroup } from '@/lib/types';

interface ProviderServicesProps {
  categories: ServiceCategoryGroup[];
  isLoading: boolean;
  onServiceSelect: (serviceId: string, optionId: string) => void;
  bookingMode?: boolean;
}

const ProviderServices = ({ 
  categories, 
  isLoading, 
  onServiceSelect,
  bookingMode = false
}: ProviderServicesProps) => {
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  
  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  if (isLoading) {
    return (
      <Card id="provider-services">
        <CardHeader className="pb-3">
          <CardTitle>Mis servicios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <div className="pl-4 space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="provider-services">
      <CardHeader className="pb-3">
        <CardTitle>Mis servicios</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            Este proveedor aún no ha publicado servicios.
          </p>
        ) : (
          categories.map(category => (
            <Collapsible
              key={category.id}
              open={openCategories.includes(category.id)}
              onOpenChange={() => toggleCategory(category.id)}
              className="border rounded-md overflow-hidden"
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-left font-medium">
                <span>{category.name}</span>
                <ChevronDown 
                  className={`h-5 w-5 transition-transform ${
                    openCategories.includes(category.id) ? 'transform rotate-180' : ''
                  }`} 
                />
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <Separator className="my-0" />
                <div className="p-4 space-y-6">
                  {category.services.map(service => (
                    <div key={service.id} className="space-y-3">
                      <h4 className="font-medium text-lg">{service.name}</h4>
                      
                      <div className="grid grid-cols-1 gap-2">
                        {service.options.map(option => (
                          <div 
                            key={option.id} 
                            className="flex items-center justify-between p-3 rounded-md bg-muted/80 hover:bg-muted"
                          >
                            <div className="flex-1">
                              <p className="font-medium">{option.size}</p>
                              <div className="flex items-center text-sm text-muted-foreground">
                                <span>{formatDuration(option.duration)}</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-semibold">${option.price}</span>
                              
                              {bookingMode && (
                                <Button 
                                  size="sm" 
                                  onClick={() => onServiceSelect(service.id, option.id)}
                                  className="bg-luxury-navy hover:bg-luxury-navy/90"
                                >
                                  Elegir
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default ProviderServices;
