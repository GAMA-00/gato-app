import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { UserCircle, CreditCard, FileText, Shield, HelpCircle, Settings } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import { updateUserProfile } from '@/utils/profileManagement';

const profileSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email no válido'),
  phone: z.string().min(8, 'Número de teléfono no válido').optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const Profile = () => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || ''
    }
  });

  const onSubmit = async (values: ProfileFormValues) => {
    if (!user?.id) return;
    
    setIsLoading(true);
    
    try {
      const result = await updateUserProfile(user.id, values);
      
      if (result.success) {
        toast({
          title: "Perfil actualizado",
          description: "Tu información personal ha sido actualizada correctamente."
        });
      } else {
        throw new Error(result.error || 'Error al actualizar el perfil');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Hubo un problema al actualizar tu perfil. Por favor, intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Redirigir si no está autenticado
  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!user) return null;

  return (
    <PageContainer 
      title="Mi Perfil" 
      subtitle="Administra tu información personal y preferencias"
    >
      <div className="container mx-auto py-6">
        <Tabs defaultValue="personal-info" className="w-full">
          <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-6">
            <TabsTrigger value="personal-info" className="flex flex-col items-center gap-1 py-2">
              <UserCircle className="h-5 w-5" />
              <span className="text-xs">Información</span>
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex flex-col items-center gap-1 py-2">
              <CreditCard className="h-5 w-5" />
              <span className="text-xs">Pagos</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex flex-col items-center gap-1 py-2">
              <FileText className="h-5 w-5" />
              <span className="text-xs">Documentos</span>
            </TabsTrigger>
            <TabsTrigger value="verification" className="flex flex-col items-center gap-1 py-2">
              <Shield className="h-5 w-5" />
              <span className="text-xs">Verificación</span>
            </TabsTrigger>
            <TabsTrigger value="support" className="flex flex-col items-center gap-1 py-2">
              <HelpCircle className="h-5 w-5" />
              <span className="text-xs">Soporte</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex flex-col items-center gap-1 py-2">
              <Settings className="h-5 w-5" />
              <span className="text-xs">Configuración</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="personal-info">
            <Card>
              <CardHeader>
                <CardTitle>Información Personal</CardTitle>
                <CardDescription>Actualiza tus datos personales</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="flex flex-col items-center">
                    <Avatar className="h-28 w-28 mb-4">
                      <AvatarImage src={user.avatarUrl || ''} alt={user.name} />
                      <AvatarFallback className="text-2xl">
                        {user.name?.substring(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <Button variant="outline" size="sm">Cambiar foto</Button>
                  </div>
                  
                  <div className="flex-1">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nombre</FormLabel>
                              <FormControl>
                                <Input placeholder="Tu nombre" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Correo electrónico</FormLabel>
                              <FormControl>
                                <Input placeholder="tucorreo@ejemplo.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Teléfono</FormLabel>
                              <FormControl>
                                <Input placeholder="Tu número de teléfono" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <Button type="submit" disabled={isLoading}>
                          {isLoading ? "Guardando..." : "Guardar cambios"}
                        </Button>
                      </form>
                    </Form>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="payment">
            <Card>
              <CardHeader>
                <CardTitle>Información de Pago</CardTitle>
                <CardDescription>Gestiona tus métodos de pago y revisa tu historial</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {user.hasPaymentMethod ? (
                  <div className="bg-muted p-4 rounded-md flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-10 w-10 text-primary" />
                      <div>
                        <p className="font-medium">Tarjeta registrada</p>
                        <p className="text-sm text-muted-foreground">**** **** **** 1234</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Editar</Button>
                  </div>
                ) : (
                  <div className="bg-amber-50 text-amber-600 border border-amber-200 p-4 rounded-md">
                    <p className="font-medium">No tienes métodos de pago registrados</p>
                    <p className="text-sm">Agrega un método de pago para facilitar tus reservas</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate('/payment-setup')}>
                      Agregar método de pago
                    </Button>
                  </div>
                )}
                
                <div className="pt-4">
                  <h3 className="font-medium mb-2">Historial de transacciones</h3>
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No hay transacciones recientes
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Documentación</CardTitle>
                <CardDescription>Información legal y documentos importantes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-md hover:bg-muted transition-colors cursor-pointer">
                    <h3 className="font-medium">Términos y Condiciones</h3>
                    <p className="text-sm text-muted-foreground">Última actualización: 01/01/2025</p>
                  </div>
                  
                  <div className="p-4 border rounded-md hover:bg-muted transition-colors cursor-pointer">
                    <h3 className="font-medium">Política de Privacidad</h3>
                    <p className="text-sm text-muted-foreground">Última actualización: 01/01/2025</p>
                  </div>
                  
                  <div className="p-4 border rounded-md hover:bg-muted transition-colors cursor-pointer">
                    <h3 className="font-medium">Reglamento de Servicios</h3>
                    <p className="text-sm text-muted-foreground">Última actualización: 01/01/2025</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="verification">
            <Card>
              <CardHeader>
                <CardTitle>Documentos Verificados</CardTitle>
                <CardDescription>Estado de tus documentos de verificación</CardDescription>
              </CardHeader>
              <CardContent>
                {user.role === 'provider' ? (
                  <div className="space-y-4">
                    <div className="p-4 border rounded-md flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">Documento de identidad</h3>
                        <p className="text-sm text-emerald-600">Verificado</p>
                      </div>
                      <Button variant="outline" size="sm">Ver</Button>
                    </div>
                    
                    <div className="p-4 border rounded-md flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">Certificación profesional</h3>
                        <p className="text-sm text-amber-600">Pendiente</p>
                      </div>
                      <Button variant="outline" size="sm">Subir</Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Esta sección está disponible solo para proveedores de servicios.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="support">
            <Card>
              <CardHeader>
                <CardTitle>Soporte</CardTitle>
                <CardDescription>¿Necesitas ayuda? Contacta con nuestro equipo de soporte</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <FormLabel>Asunto</FormLabel>
                    <Input placeholder="Describe brevemente tu problema" />
                  </div>
                  <div>
                    <FormLabel>Mensaje</FormLabel>
                    <Textarea 
                      placeholder="Explica con detalle tu consulta o problema" 
                      className="min-h-[150px]"
                    />
                  </div>
                  <Button>Enviar mensaje</Button>
                </div>
              </CardContent>
              <CardFooter className="flex-col items-start">
                <h3 className="text-sm font-medium">Contacto directo</h3>
                <p className="text-sm text-muted-foreground">
                  También puedes contactarnos en soporte@gato.com o al teléfono +1 234 567 890
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Configuración</CardTitle>
                <CardDescription>Personaliza tu experiencia en la plataforma</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-2">Preferencias de idioma</h3>
                    <select className="w-full p-2 border rounded">
                      <option value="es">Español</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Seguridad</h3>
                    <Button variant="outline">Cambiar contraseña</Button>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Notificaciones</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Notificaciones por correo</label>
                        <input type="checkbox" className="toggle" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm">Notificaciones de la aplicación</label>
                        <input type="checkbox" className="toggle" defaultChecked />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2 text-red-500">Zona de peligro</h3>
                    <div className="space-y-2">
                      <Button variant="destructive">Eliminar mi cuenta</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
};

export default Profile;
