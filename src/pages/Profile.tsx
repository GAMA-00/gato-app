import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { UserCircle, CreditCard, FileText, Shield, HelpCircle, Settings } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import { updateUserProfile, updateUserAvatar, fetchUserProfile } from '@/utils/profileManagement';
import { useIsMobile } from '@/hooks/use-mobile';
import { useResidencias } from '@/hooks/useResidencias';
import { useCondominiums } from '@/hooks/useCondominiums';
import ImageUploader from '@/components/common/ImageUploader';

const profileSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email no válido'),
  phone: z.string().min(8, 'Número de teléfono no válido').optional(),
  residencia_id: z.string().optional(),
  condominium_id: z.string().optional(),
  house_number: z.string().optional(),
});

const supportSchema = z.object({
  subject: z.string().min(3, 'El asunto debe tener al menos 3 caracteres'),
  message: z.string().min(10, 'El mensaje debe tener al menos 10 caracteres'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type SupportFormValues = z.infer<typeof supportSchema>;

const Profile = () => {
  const { user, isAuthenticated, updateUserAvatar: updateContextAvatar } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(user?.avatarUrl || '');
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const isMobile = useIsMobile();

  console.log('=== Profile Component Debug ===');
  console.log('User from context:', user);
  console.log('User avatarUrl from context:', user?.avatarUrl);
  console.log('Current avatar URL state:', currentAvatarUrl);
  console.log('Is authenticated:', isAuthenticated);
  console.log('Profile data state:', profileData);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      residencia_id: '',
      condominium_id: '',
      house_number: ''
    }
  });
  
  const supportForm = useForm<SupportFormValues>({
    resolver: zodResolver(supportSchema),
    defaultValues: {
      subject: '',
      message: ''
    }
  });

  // Watch residencia_id to fetch condominiums when it changes
  const selectedResidenciaId = profileForm.watch('residencia_id');
  
  // Fetch residencias and condominiums
  const { data: residencias, isLoading: isLoadingResidencias } = useResidencias();
  const { data: condominiums, isLoading: isLoadingCondominiums } = useCondominiums(selectedResidenciaId);

  // Reset condominium when residencia changes
  useEffect(() => {
    if (selectedResidenciaId !== profileData?.residencia_id) {
      profileForm.setValue('condominium_id', '');
    }
  }, [selectedResidenciaId, profileForm, profileData?.residencia_id]);

  // Cargar datos actualizados del perfil
  useEffect(() => {
    if (user?.id) {
      const loadUserProfile = async () => {
        setIsLoadingProfile(true);
        try {
          console.log('=== Loading Profile Data ===');
          console.log('Loading profile for user:', user.id, 'with role:', user.role);
          const profileDataResult = await fetchUserProfile(user.id, user.role);
          console.log('=== Profile Data Result ===', profileDataResult);
          
          if (profileDataResult) {
            console.log('=== Profile Data Loaded Successfully ===');
            setProfileData(profileDataResult);
            
            // Update form with loaded data
            profileForm.reset({
              name: profileDataResult.name || '',
              email: profileDataResult.email || '',
              phone: profileDataResult.phone || '',
              residencia_id: profileDataResult.residencia_id || '',
              condominium_id: profileDataResult.condominium_id || '',
              house_number: profileDataResult.house_number || ''
            });
            
            const avatarToUse = profileDataResult.avatarUrl || profileDataResult.avatar_url || '';
            console.log('=== Avatar Selection Logic ===');
            console.log('Final avatar selected:', avatarToUse);
            
            setCurrentAvatarUrl(avatarToUse);
            console.log('Avatar URL set in state:', avatarToUse);
          } else {
            console.log('No profile data returned');
            // If no profile data, use context user data as fallback
            console.log('Using context user data as fallback');
            profileForm.reset({
              name: user.name || '',
              email: user.email || '',
              phone: user.phone || '',
              residencia_id: user.residenciaId || '',
              condominium_id: user.condominiumId || '',
              house_number: user.houseNumber || ''
            });
            setCurrentAvatarUrl(user.avatarUrl || '');
          }
        } catch (error) {
          console.error('Error loading profile:', error);
          toast({
            title: "Error",
            description: "No se pudo cargar el perfil. Usando datos del contexto.",
            variant: "destructive"
          });
          // Fallback to context user data
          profileForm.reset({
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            residencia_id: user.residenciaId || '',
            condominium_id: user.condominiumId || '',
            house_number: user.houseNumber || ''
          });
          setCurrentAvatarUrl(user.avatarUrl || '');
        } finally {
          setIsLoadingProfile(false);
        }
      };
      
      loadUserProfile();
    }
  }, [user, profileForm, toast]);

  const onSubmitProfile = async (values: ProfileFormValues) => {
    if (!user?.id) return;
    
    setIsLoading(true);
    
    try {
      console.log('=== Submitting Profile Data ===');
      console.log('Values to submit:', values);
      
      // Prepare data for update
      const updateData = {
        ...values,
        role: user.role,
        // Ensure proper UUID format or null
        residencia_id: values.residencia_id || null,
        condominium_id: values.condominium_id || null,
        house_number: values.house_number || null
      };
      
      console.log('Final update data:', updateData);
      
      const result = await updateUserProfile(user.id, updateData);
      
      if (result.success) {
        toast({
          title: "Perfil actualizado",
          description: "Tu información personal ha sido actualizada correctamente."
        });
        
        updateContextAvatar(currentAvatarUrl);
        
        // Refresh profile data
        const refreshedProfile = await fetchUserProfile(user.id, user.role);
        if (refreshedProfile) {
          setProfileData(refreshedProfile);
        }
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
  
  const handleImageUploaded = async (url: string) => {
    if (!user?.id) return;
    
    console.log('=== Profile - handleImageUploaded ===');
    console.log('Received URL:', url);
    
    setIsUploadingImage(true);
    try {
      const result = await updateUserAvatar(user.id, url, user.role);
      
      if (result.success) {
        console.log('Avatar update successful, updating states...');
        
        // Update local state immediately
        setCurrentAvatarUrl(url);
        
        // Update context
        updateContextAvatar(url);
        
        // Update profile data state if it exists
        if (profileData) {
          setProfileData({
            ...profileData,
            avatar_url: url,
            avatarUrl: url
          });
        }
        
        console.log('All states updated with new avatar URL:', url);
        
        toast({
          title: "Imagen actualizada",
          description: "Tu foto de perfil ha sido actualizada correctamente."
        });
        
        // Force a profile data refresh to verify the update
        setTimeout(async () => {
          if (user?.id) {
            const refreshedProfile = await fetchUserProfile(user.id, user.role);
            if (refreshedProfile) {
              console.log('Profile refreshed with avatar:', refreshedProfile.avatarUrl);
              setProfileData(refreshedProfile);
              setCurrentAvatarUrl(refreshedProfile.avatarUrl || '');
            }
          }
        }, 1000);
        
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar tu foto de perfil. Por favor, intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsUploadingImage(false);
    }
  };
  
  const onSubmitSupport = (values: SupportFormValues) => {
    toast({
      title: "Mensaje enviado",
      description: "Tu mensaje ha sido enviado correctamente. Te responderemos a la brevedad."
    });
    supportForm.reset();
  };

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!user) return null;

  if (isLoadingProfile) {
    return (
      <PageContainer title="Mi Perfil" subtitle="Cargando información del perfil...">
        <div className="flex justify-center items-center min-h-[300px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </PageContainer>
    );
  }

  console.log('=== Avatar Rendering Debug ===');
  console.log('About to render avatar with URL:', currentAvatarUrl);
  console.log('User name for fallback:', user.name);

  return (
    <PageContainer 
      title="Mi Perfil" 
      subtitle="Administra tu información personal y preferencias"
    >
      <div className="container mx-auto py-2 px-2 md:py-6 md:px-6">
        <Tabs defaultValue="personal-info" className="w-full">
          <TabsList className={`flex flex-wrap gap-1 mb-4 p-1 overflow-x-auto ${isMobile ? 'justify-start' : 'grid grid-cols-3 md:grid-cols-6'}`}>
            <TabsTrigger value="personal-info" className="flex flex-col items-center gap-1 py-2 flex-1 min-w-[70px]">
              <UserCircle className="h-4 w-4 md:h-5 md:w-5" />
              <span className="text-[10px] md:text-xs">Información</span>
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex flex-col items-center gap-1 py-2 flex-1 min-w-[70px]">
              <CreditCard className="h-4 w-4 md:h-5 md:w-5" />
              <span className="text-[10px] md:text-xs">Pagos</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex flex-col items-center gap-1 py-2 flex-1 min-w-[70px]">
              <FileText className="h-4 w-4 md:h-5 md:w-5" />
              <span className="text-[10px] md:text-xs">Documentos</span>
            </TabsTrigger>
            <TabsTrigger value="verification" className="flex flex-col items-center gap-1 py-2 flex-1 min-w-[70px]">
              <Shield className="h-4 w-4 md:h-5 md:w-5" />
              <span className="text-[10px] md:text-xs">Verificación</span>
            </TabsTrigger>
            <TabsTrigger value="support" className="flex flex-col items-center gap-1 py-2 flex-1 min-w-[70px]">
              <HelpCircle className="h-4 w-4 md:h-5 md:w-5" />
              <span className="text-[10px] md:text-xs">Soporte</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex flex-col items-center gap-1 py-2 flex-1 min-w-[70px]">
              <Settings className="h-4 w-4 md:h-5 md:w-5" />
              <span className="text-[10px] md:text-xs">Config</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="personal-info" className="animate-scale-in">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg md:text-xl">Información Personal</CardTitle>
                <CardDescription>Actualiza tus datos personales</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-start">
                  <div className="flex flex-col items-center self-center mb-4 md:mb-0">
                    <Avatar className="h-20 w-20 md:h-28 md:w-28 mb-3">
                      <AvatarImage 
                        src={currentAvatarUrl} 
                        alt={user.name}
                        key={currentAvatarUrl} // Force re-render when URL changes
                        onLoad={() => {
                          console.log('=== Avatar Image Loaded Successfully ===');
                          console.log('Loaded URL:', currentAvatarUrl);
                        }}
                        onError={(e) => {
                          console.error('=== Avatar Image Failed to Load ===');
                          console.error('Failed URL:', currentAvatarUrl);
                          console.error('Error event:', e);
                        }}
                      />
                      <AvatarFallback className="text-2xl">
                        {user.name?.substring(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <ImageUploader 
                      onImageUploaded={handleImageUploaded}
                      currentImageUrl={currentAvatarUrl}
                      buttonText="Cambiar foto"
                    />
                    {isUploadingImage && (
                      <p className="text-xs text-muted-foreground mt-1">Subiendo imagen...</p>
                    )}
                  </div>
                  
                  <div className="flex-1 w-full">
                    <Form {...profileForm}>
                      <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-3 md:space-y-4">
                        <FormField
                          control={profileForm.control}
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
                          control={profileForm.control}
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
                          control={profileForm.control}
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

                        {/* Location fields for clients */}
                        {user.role === 'client' && (
                          <>
                            <FormField
                              control={profileForm.control}
                              name="residencia_id"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Residencia</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    value={field.value}
                                    disabled={isLoadingResidencias}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder={isLoadingResidencias ? "Cargando residencias..." : "Selecciona tu residencia"} />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {residencias?.map((residencia) => (
                                        <SelectItem key={residencia.id} value={residencia.id}>
                                          {residencia.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={profileForm.control}
                              name="condominium_id"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Condominio (opcional)</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    value={field.value}
                                    disabled={!selectedResidenciaId || isLoadingCondominiums}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue 
                                          placeholder={
                                            !selectedResidenciaId 
                                              ? "Primero selecciona una residencia" 
                                              : isLoadingCondominiums 
                                                ? "Cargando condominios..." 
                                                : "Selecciona tu condominio (opcional)"
                                          } 
                                        />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="">Sin condominio</SelectItem>
                                      {condominiums?.map((condominium) => (
                                        <SelectItem key={condominium.id} value={condominium.id}>
                                          {condominium.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={profileForm.control}
                              name="house_number"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Número de casa</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Ej: 123, A-5, Lote 10" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}
                        
                        <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                          {isLoading ? "Guardando..." : "Guardar cambios"}
                        </Button>
                      </form>
                    </Form>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="payment" className="animate-scale-in">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg md:text-xl">Información de Pago</CardTitle>
                <CardDescription>Gestiona tus métodos de pago y revisa tu historial</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {user.hasPaymentMethod ? (
                  <div className="bg-muted p-3 md:p-4 rounded-md flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage 
                          src={currentAvatarUrl} 
                          alt={user.name}
                        />
                        <AvatarFallback className="text-sm">
                          {user.name?.substring(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-8 w-8 md:h-10 md:w-10 text-primary" />
                        <div>
                          <p className="font-medium text-sm md:text-base">Tarjeta registrada</p>
                          <p className="text-xs md:text-sm">**** **** **** 1234</p>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Editar</Button>
                  </div>
                ) : (
                  <div className="bg-amber-50 text-amber-600 border border-amber-200 p-3 md:p-4 rounded-md">
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage 
                          src={currentAvatarUrl} 
                          alt={user.name}
                        />
                        <AvatarFallback className="text-sm">
                          {user.name?.substring(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm md:text-base">No tienes métodos de pago registrados</p>
                        <p className="text-xs md:text-sm">Agrega un método de pago para facilitar tus reservas</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={() => navigate('/payment-setup')}>
                      Agregar método de pago
                    </Button>
                  </div>
                )}
                
                <div className="pt-2 md:pt-4">
                  <h3 className="font-medium text-sm md:text-base mb-2">Historial de transacciones</h3>
                  <div className="text-center py-6 md:py-8 text-muted-foreground text-xs md:text-sm">
                    No hay transacciones recientes
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="documents" className="animate-scale-in">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg md:text-xl">Documentación</CardTitle>
                <CardDescription>Información legal y documentos importantes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 md:space-y-4">
                  <div className="p-3 md:p-4 border rounded-md hover:bg-muted transition-colors cursor-pointer">
                    <h3 className="font-medium text-sm md:text-base">Términos y Condiciones</h3>
                    <p className="text-xs md:text-sm text-muted-foreground">Última actualización: 01/01/2025</p>
                  </div>
                  
                  <div className="p-3 md:p-4 border rounded-md hover:bg-muted transition-colors cursor-pointer">
                    <h3 className="font-medium text-sm md:text-base">Política de Privacidad</h3>
                    <p className="text-xs md:text-sm text-muted-foreground">Última actualización: 01/01/2025</p>
                  </div>
                  
                  <div className="p-3 md:p-4 border rounded-md hover:bg-muted transition-colors cursor-pointer">
                    <h3 className="font-medium text-sm md:text-base">Reglamento de Servicios</h3>
                    <p className="text-xs md:text-sm text-muted-foreground">Última actualización: 01/01/2025</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="verification" className="animate-scale-in">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg md:text-xl">Documentos Verificados</CardTitle>
                <CardDescription>Estado de tus documentos de verificación</CardDescription>
              </CardHeader>
              <CardContent>
                {user.role === 'provider' ? (
                  <div className="space-y-3 md:space-y-4">
                    <div className="p-3 md:p-4 border rounded-md flex justify-between items-center">
                      <div>
                        <h3 className="font-medium text-sm md:text-base">Documento de identidad</h3>
                        <p className="text-xs md:text-sm text-emerald-600">Verificado</p>
                      </div>
                      <Button variant="outline" size="sm">Ver</Button>
                    </div>
                    
                    <div className="p-3 md:p-4 border rounded-md flex justify-between items-center">
                      <div>
                        <h3 className="font-medium text-sm md:text-base">Certificación profesional</h3>
                        <p className="text-xs md:text-sm text-amber-600">Pendiente</p>
                      </div>
                      <Button variant="outline" size="sm">Subir</Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 md:py-8">
                    <p className="text-xs md:text-sm text-muted-foreground">Esta sección está disponible solo para proveedores de servicios.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="support" className="animate-scale-in">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg md:text-xl">Soporte</CardTitle>
                <CardDescription>¿Necesitas ayuda? Contacta con nuestro equipo de soporte</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...supportForm}>
                  <form onSubmit={supportForm.handleSubmit(onSubmitSupport)} className="space-y-3 md:space-y-4">
                    <FormField
                      control={supportForm.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Asunto</FormLabel>
                          <FormControl>
                            <Input placeholder="Describe brevemente tu problema" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={supportForm.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mensaje</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Explica con detalle tu consulta o problema" 
                              className="min-h-[100px] md:min-h-[150px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" className="w-full md:w-auto">Enviar mensaje</Button>
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="flex-col items-start text-xs md:text-sm pt-3 pb-4">
                <h3 className="font-medium">Contacto directo</h3>
                <p className="text-muted-foreground">
                  También puedes contactarnos en soporte@gato.com o al teléfono +1 234 567 890
                </p>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="settings" className="animate-scale-in">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg md:text-xl">Configuración</CardTitle>
                <CardDescription>Personaliza tu experiencia en la plataforma</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 md:space-y-6">
                  <div>
                    <h3 className="font-medium text-sm md:text-base mb-2">Preferencias de idioma</h3>
                    <select className="w-full p-2 border rounded text-sm">
                      <option value="es">Español</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-sm md:text-base mb-2">Seguridad</h3>
                    <Button variant="outline" size="sm">Cambiar contraseña</Button>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-sm md:text-base mb-2">Notificaciones</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs md:text-sm">Notificaciones por correo</label>
                        <input type="checkbox" className="toggle" defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs md:text-sm">Notificaciones de la aplicación</label>
                        <input type="checkbox" className="toggle" defaultChecked />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-sm md:text-base mb-2 text-red-500">Zona de peligro</h3>
                    <div className="space-y-2">
                      <Button variant="destructive" size="sm">Eliminar mi cuenta</Button>
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
