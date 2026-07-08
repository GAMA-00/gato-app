# 🧩 Skill: Patrones de UI Comunes

> **Versión:** 1.0 DOE  
> **Última actualización:** Febrero 2026

## Contexto

Esta skill documenta los patrones de UI más utilizados en Gato App. Usar estos patrones garantiza consistencia visual y reduce tiempo de desarrollo.

---

## 📄 Patrones de Página

### Layout de Página Estándar

```tsx
const MiPagina = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header con título */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Título</h1>
          <Button variant="outline" size="sm">
            Acción
          </Button>
        </div>
      </header>
      
      {/* Contenido principal */}
      <main className="container mx-auto px-4 py-6 pb-safe">
        {/* Contenido */}
      </main>
    </div>
  );
};
```

### Layout con Tabs

```tsx
<Tabs defaultValue="tab1" className="w-full">
  <TabsList className="w-full justify-start">
    <TabsTrigger value="tab1">Activas</TabsTrigger>
    <TabsTrigger value="tab2">Historial</TabsTrigger>
    <TabsTrigger value="tab3">Pendientes</TabsTrigger>
  </TabsList>
  
  <TabsContent value="tab1" className="mt-4">
    {/* Contenido tab 1 */}
  </TabsContent>
  
  <TabsContent value="tab2" className="mt-4">
    {/* Contenido tab 2 */}
  </TabsContent>
</Tabs>
```

---

## 🃏 Patrones de Cards

### Card de Servicio

```tsx
<Card className="overflow-hidden">
  {/* Imagen */}
  <div className="aspect-video bg-muted relative">
    <img 
      src={service.image} 
      alt={service.name}
      className="object-cover w-full h-full"
    />
    {service.isPopular && (
      <Badge className="absolute top-2 right-2 bg-warning">
        Popular
      </Badge>
    )}
  </div>
  
  <CardContent className="p-4">
    <h3 className="font-semibold text-lg">{service.name}</h3>
    <p className="text-sm text-muted-foreground line-clamp-2">
      {service.description}
    </p>
    
    <div className="flex items-center justify-between mt-4">
      <span className="text-lg font-bold text-success">
        ₡{service.price.toLocaleString()}
      </span>
      <Button size="sm">Reservar</Button>
    </div>
  </CardContent>
</Card>
```

### Card de Cita

```tsx
<Card className="p-4">
  <div className="flex items-start gap-4">
    {/* Avatar */}
    <Avatar className="h-12 w-12">
      <AvatarImage src={provider.avatar} />
      <AvatarFallback>{provider.name[0]}</AvatarFallback>
    </Avatar>
    
    {/* Info */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold truncate">{service.name}</h3>
        <Badge variant={getStatusVariant(status)}>
          {getStatusLabel(status)}
        </Badge>
      </div>
      
      <p className="text-sm text-muted-foreground">
        {provider.name}
      </p>
      
      <div className="flex items-center gap-2 mt-2 text-sm">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span>{formatDate(appointment.date)}</span>
        <Clock className="h-4 w-4 text-muted-foreground ml-2" />
        <span>{formatTime(appointment.time)}</span>
      </div>
    </div>
  </div>
  
  {/* Acciones */}
  <div className="flex gap-2 mt-4">
    <Button variant="outline" className="flex-1" size="sm">
      Reagendar
    </Button>
    <Button className="flex-1" size="sm">
      Ver detalles
    </Button>
  </div>
</Card>
```

### Card de Estadística

```tsx
<Card className="p-4">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-muted-foreground">Ingresos del mes</p>
      <p className="text-2xl font-bold">₡450,000</p>
      <p className="text-xs text-success flex items-center mt-1">
        <TrendingUp className="h-3 w-3 mr-1" />
        +12% vs mes anterior
      </p>
    </div>
    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
      <DollarSign className="h-6 w-6 text-primary" />
    </div>
  </div>
</Card>
```

---

## 📋 Patrones de Listas

### Lista de Items Seleccionables

```tsx
<div className="space-y-2">
  {items.map((item) => (
    <Card
      key={item.id}
      className={cn(
        "p-4 cursor-pointer transition-colors",
        selectedId === item.id 
          ? "border-primary bg-primary/5" 
          : "hover:bg-muted"
      )}
      onClick={() => onSelect(item.id)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-4 w-4 rounded-full border-2",
            selectedId === item.id 
              ? "border-primary bg-primary" 
              : "border-muted-foreground"
          )} />
          <span>{item.name}</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Card>
  ))}
</div>
```

### Lista Agrupada por Fecha

```tsx
{Object.entries(groupedByDate).map(([date, items]) => (
  <div key={date} className="mb-6">
    <h3 className="text-sm font-medium text-muted-foreground mb-3 sticky top-0 bg-background py-2">
      {formatDate(date)}
    </h3>
    <div className="space-y-3">
      {items.map((item) => (
        <AppointmentCard key={item.id} appointment={item} />
      ))}
    </div>
  </div>
))}
```

---

## 📱 Patrones Mobile

### Bottom Sheet

```tsx
<Sheet>
  <SheetTrigger asChild>
    <Button>Abrir opciones</Button>
  </SheetTrigger>
  <SheetContent side="bottom" className="h-auto max-h-[85vh]">
    <SheetHeader>
      <SheetTitle>Opciones</SheetTitle>
    </SheetHeader>
    <div className="py-4 space-y-4">
      {/* Contenido del sheet */}
    </div>
  </SheetContent>
</Sheet>
```

### Bottom Navigation

```tsx
<nav className="fixed bottom-0 left-0 right-0 bg-background border-t safe-area-bottom z-50">
  <div className="flex justify-around py-2">
    {navItems.map((item) => (
      <Link
        key={item.path}
        to={item.path}
        className={cn(
          "flex flex-col items-center py-2 px-4 min-w-[64px]",
          isActive(item.path) 
            ? "text-primary" 
            : "text-muted-foreground"
        )}
      >
        <item.icon className="h-5 w-5" />
        <span className="text-xs mt-1">{item.label}</span>
      </Link>
    ))}
  </div>
</nav>
```

### Pull to Refresh (Simulado)

```tsx
<div className="min-h-screen">
  {isRefreshing && (
    <div className="flex justify-center py-4">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  )}
  {/* Contenido */}
</div>
```

---

## 💬 Patrones de Feedback

### Toast Notifications

```tsx
import { toast } from '@/hooks/use-toast';

// Éxito
toast({
  title: "Reserva confirmada",
  description: "Tu cita ha sido agendada exitosamente.",
});

// Error
toast({
  title: "Error",
  description: "No se pudo completar la acción.",
  variant: "destructive",
});

// Con acción
toast({
  title: "Cita cancelada",
  description: "La reserva ha sido cancelada.",
  action: (
    <Button variant="outline" size="sm" onClick={handleUndo}>
      Deshacer
    </Button>
  ),
});
```

### Empty State

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
    <Calendar className="h-8 w-8 text-muted-foreground" />
  </div>
  <h3 className="text-lg font-semibold mb-2">No hay citas</h3>
  <p className="text-sm text-muted-foreground max-w-sm mb-4">
    Aún no tienes citas programadas. Explora servicios para hacer tu primera reserva.
  </p>
  <Button>
    <Plus className="h-4 w-4 mr-2" />
    Buscar servicios
  </Button>
</div>
```

### Loading State

```tsx
// Skeleton para cards
<div className="space-y-4">
  {[1, 2, 3].map((i) => (
    <Card key={i} className="p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </Card>
  ))}
</div>

// Spinner centrado
<div className="flex items-center justify-center py-12">
  <Loader2 className="h-8 w-8 animate-spin text-primary" />
</div>
```

### Error State

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
    <AlertCircle className="h-8 w-8 text-destructive" />
  </div>
  <h3 className="text-lg font-semibold mb-2">Algo salió mal</h3>
  <p className="text-sm text-muted-foreground max-w-sm mb-4">
    No pudimos cargar la información. Por favor intenta de nuevo.
  </p>
  <Button variant="outline" onClick={handleRetry}>
    <RefreshCw className="h-4 w-4 mr-2" />
    Reintentar
  </Button>
</div>
```

---

## 📝 Patrones de Formularios

### Form con Validación

```tsx
const form = useForm<FormData>({
  resolver: zodResolver(formSchema),
  defaultValues: { ... },
});

return (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input placeholder="email@ejemplo.com" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Guardando...
          </>
        ) : (
          'Guardar'
        )}
      </Button>
    </form>
  </Form>
);
```

### Form Inline

```tsx
<div className="flex gap-2">
  <Input 
    placeholder="Buscar..." 
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="flex-1"
  />
  <Button type="submit">
    <Search className="h-4 w-4" />
  </Button>
</div>
```

---

## 🎛️ Patrones de Selección

### Selector de Fecha

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" className="w-full justify-start text-left">
      <Calendar className="mr-2 h-4 w-4" />
      {date ? format(date, 'PPP', { locale: es }) : 'Seleccionar fecha'}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0" align="start">
    <CalendarComponent
      mode="single"
      selected={date}
      onSelect={setDate}
      disabled={(date) => date < new Date()}
    />
  </PopoverContent>
</Popover>
```

### Selector de Slots de Tiempo

```tsx
<div className="grid grid-cols-3 gap-2">
  {slots.map((slot) => (
    <Button
      key={slot.time}
      variant={selectedSlot === slot.time ? "default" : "outline"}
      className={cn(
        "h-12",
        !slot.available && "opacity-50 cursor-not-allowed"
      )}
      disabled={!slot.available}
      onClick={() => setSelectedSlot(slot.time)}
    >
      {slot.time}
    </Button>
  ))}
</div>
```

### Multi-Select con Chips

```tsx
<div className="flex flex-wrap gap-2">
  {options.map((option) => (
    <Badge
      key={option.id}
      variant={selected.includes(option.id) ? "default" : "outline"}
      className="cursor-pointer"
      onClick={() => toggleSelection(option.id)}
    >
      {selected.includes(option.id) && (
        <Check className="h-3 w-3 mr-1" />
      )}
      {option.label}
    </Badge>
  ))}
</div>
```

---

## 🔄 Patrones de Confirmación

### Dialog de Confirmación

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Cancelar cita</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
      <AlertDialogDescription>
        Esta acción cancelará tu cita. Dependiendo de la política de 
        cancelación, podrías recibir un reembolso parcial.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Volver</AlertDialogCancel>
      <AlertDialogAction onClick={handleCancel}>
        Sí, cancelar
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Inline Confirmation

```tsx
{showConfirm ? (
  <div className="flex gap-2">
    <Button variant="destructive" size="sm" onClick={handleConfirm}>
      Confirmar
    </Button>
    <Button variant="outline" size="sm" onClick={() => setShowConfirm(false)}>
      Cancelar
    </Button>
  </div>
) : (
  <Button variant="ghost" size="sm" onClick={() => setShowConfirm(true)}>
    <Trash className="h-4 w-4" />
  </Button>
)}
```

---

## 📋 Checklist de Patrones

Al implementar UI, verificar:

- [ ] ¿Existe ya un patrón similar en la app?
- [ ] ¿El componente maneja loading/error/empty states?
- [ ] ¿Las acciones tienen feedback (toast/loading)?
- [ ] ¿Los formularios tienen validación visual?
- [ ] ¿Las acciones destructivas piden confirmación?
- [ ] ¿El patrón es responsive?
