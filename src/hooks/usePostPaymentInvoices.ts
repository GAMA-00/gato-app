
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PostPaymentInvoice {
  id: string;
  appointment_id: string;
  provider_id: string;
  client_id: string;
  base_price: number;
  total_price: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  rejection_reason?: string;
  evidence_file_url?: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  approved_at?: string;
  rejected_at?: string;
}

export interface PostPaymentItem {
  id: string;
  invoice_id: string;
  item_name: string;
  description?: string;
  amount: number;
  evidence_file_url?: string;
}

export interface CreateInvoiceData {
  appointment_id: string;
  provider_id: string;
  client_id: string;
  base_price: number;
}

// Hook to auto-create invoices for completed post-payment appointments
export const useAutoCreatePostPaymentInvoices = (providerId?: string) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['auto-create-invoices', providerId],
    queryFn: async () => {
      if (!providerId) return { created: 0, message: 'No provider ID' };

      console.log('Checking for completed services that need invoicing...');

      // Get completed appointments for post-payment services
      const { data: completedServices, error: servicesError } = await supabase
        .from('appointments')
        .select(`
          id,
          provider_id,
          client_id,
          listing_id,
          listings!inner(
            base_price,
            is_post_payment
          )
        `)
        .eq('provider_id', providerId)
        .eq('status', 'completed')
        .eq('listings.is_post_payment', true);

      if (servicesError) {
        console.error('Error fetching completed services:', servicesError);
        throw servicesError;
      }

      if (!completedServices?.length) {
        console.log('No completed post-payment services found');
        return { created: 0, message: 'No completed services' };
      }

      // Get existing invoices for these appointments
      const appointmentIds = completedServices.map(s => s.id);
      const { data: existingInvoices, error: invoicesError } = await supabase
        .from('post_payment_invoices')
        .select('appointment_id')
        .in('appointment_id', appointmentIds);

      if (invoicesError) {
        console.error('Error fetching existing invoices:', invoicesError);
        throw invoicesError;
      }

      const invoicedAppointmentIds = new Set(existingInvoices?.map(inv => inv.appointment_id) || []);
      
      // Filter out appointments that already have invoices
      const servicesNeedingInvoices = completedServices.filter(
        service => !invoicedAppointmentIds.has(service.id)
      );

      if (servicesNeedingInvoices.length === 0) {
        console.log('All completed services already have invoices');
        return { created: 0, message: 'All invoiced' };
      }

      console.log(`Creating ${servicesNeedingInvoices.length} draft invoices...`);

      // Create draft invoices for services without invoices
      const invoicesToCreate = servicesNeedingInvoices.map(service => ({
        appointment_id: service.id,
        provider_id: service.provider_id,
        client_id: service.client_id,
        base_price: (service.listings as any)?.base_price || 0,
        total_price: (service.listings as any)?.base_price || 0,
        status: 'draft' as const,
      }));

      const { error: createError } = await supabase
        .from('post_payment_invoices')
        .insert(invoicesToCreate);

      if (createError) {
        console.error('Error creating draft invoices:', createError);
        throw createError;
      }

      console.log(`Successfully created ${invoicesToCreate.length} draft invoices`);

      // Invalidate related queries
      await queryClient.invalidateQueries({ queryKey: ['pending-invoices'] });
      await queryClient.invalidateQueries({ queryKey: ['post-payment-services'] });

      return { 
        created: invoicesToCreate.length, 
        message: `Created ${invoicesToCreate.length} invoices` 
      };
    },
    enabled: !!providerId,
    refetchInterval: 10000, // Reduced from 30s to 10s as fallback (trigger is primary)
  });
};

// Hook to fetch pending invoices for provider (draft, rejected, submitted)
export const usePendingInvoices = (providerId?: string) => {
  const queryClient = useQueryClient();
  
  // Auto-create invoices for completed post-payment services
  useAutoCreatePostPaymentInvoices(providerId);

  // Real-time subscription to appointments for instant invoice updates
  useEffect(() => {
    if (!providerId) return;

    const channel = supabase
      .channel('provider-completed-appointments')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `provider_id=eq.${providerId}`
        },
        (payload) => {
          // If an appointment changed to completed, invalidate queries
          if (payload.new.status === 'completed' && payload.old.status !== 'completed') {
            console.log('📊 Appointment completed, refreshing invoices');
            queryClient.invalidateQueries({ queryKey: ['pending-invoices'] });
            queryClient.invalidateQueries({ queryKey: ['pending-invoices-count'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [providerId, queryClient]);

  return useQuery({
    queryKey: ['pending-invoices', providerId],
    queryFn: async () => {
      if (!providerId) return [];

      const { data, error } = await supabase
        .from('post_payment_invoices')
        .select(`
          *,
          appointments!inner(
            id,
            client_name,
            start_time,
            end_time,
            listings!inner(
              title
            )
          )
        `)
        .eq('provider_id', providerId)
        .in('status', ['draft', 'rejected', 'submitted'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending invoices:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!providerId,
    refetchInterval: 30000,
  });
};

// Hook for clients to get invoices waiting for approval
export const useClientInvoices = (clientId?: string) => {
  return useQuery({
    queryKey: ['client-invoices', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('post_payment_invoices')
        .select(`
          *,
          appointments!inner(
            id,
            provider_name,
            start_time,
            end_time,
            listings!inner(
              title
            )
          )
        `)
        .eq('client_id', clientId)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: true });

      if (error) {
        console.error('Error fetching client invoices:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!clientId,
    refetchInterval: 30000,
  });
};

// Hook to get invoice items
export const useInvoiceItems = (invoiceId?: string) => {
  return useQuery({
    queryKey: ['invoice-items', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];

      const { data, error } = await supabase
        .from('post_payment_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching invoice items:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!invoiceId,
  });
};

// Mutation to create or update an invoice
export const useInvoiceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      invoiceData, 
      items 
    }: { 
      invoiceData: PostPaymentInvoice | Omit<PostPaymentInvoice, 'id' | 'created_at' | 'updated_at'>;
      items: Array<{ 
        item_name: string; 
        description?: string; 
        amount: number; 
        evidenceFile?: File;
        existingUrl?: string; // 🆕 URL existente
      }>;
    }) => {
      let invoiceId = ('id' in invoiceData) ? invoiceData.id : undefined;

      // Create or update invoice
      if (invoiceId) {
        const { error } = await supabase
          .from('post_payment_invoices')
          .update(invoiceData)
          .eq('id', invoiceId);
        
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('post_payment_invoices')
          .insert(invoiceData)
          .select()
          .single();
        
        if (error) throw error;
        invoiceId = data.id;
      }

      // Delete existing items if updating (prevenir duplicados)
      if ('id' in invoiceData && invoiceData.id) {
        console.log('🗑️ Deleting existing items for invoice:', invoiceId);
        const { error: deleteError } = await supabase
          .from('post_payment_items')
          .delete()
          .eq('invoice_id', invoiceId);
        
        if (deleteError) {
          console.error('Error deleting existing items:', deleteError);
        }
      }

      // Get authenticated user for storage path
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado para subir evidencias');
      }

      // Process and insert new items
      const itemsToInsert = [];
      for (const item of items) {
        let evidenceUrl = item.existingUrl || null; // 🆕 Preservar URL existente

        // Solo subir si hay archivo nuevo
        if (item.evidenceFile) {
          // Use user ID as first folder to match RLS policy
          const storagePath = `${user.id}/invoices/${invoiceId}/${Date.now()}_${item.evidenceFile.name}`;
          
          // Convertir a ArrayBuffer para mejor compatibilidad
          const fileBuffer = await item.evidenceFile.arrayBuffer();
          
          console.log('📤 Uploading evidence to:', storagePath);
          
          const { error: uploadError } = await supabase.storage
            .from('service-gallery')
            .upload(storagePath, fileBuffer, {
              contentType: item.evidenceFile.type,
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('❌ Error uploading evidence:', uploadError);
            // No lanzar error, continuar sin evidencia nueva
          } else {
            const { data: urlData } = supabase.storage
              .from('service-gallery')
              .getPublicUrl(storagePath);
            evidenceUrl = urlData.publicUrl;
            console.log('✅ Evidence uploaded:', evidenceUrl);
          }
        }

        itemsToInsert.push({
          invoice_id: invoiceId,
          item_name: item.item_name,
          description: item.description || null,
          amount: item.amount,
          evidence_file_url: evidenceUrl // Puede ser nueva URL o existente
        });
      }

      // Insert new items (sin duplicados porque borramos antes)
      if (itemsToInsert.length > 0) {
        console.log(`📝 Inserting ${itemsToInsert.length} items for invoice:`, invoiceId);
        const { error } = await supabase
          .from('post_payment_items')
          .insert(itemsToInsert);
        
        if (error) {
          console.error('Error inserting items:', error);
          throw error;
        }
        console.log('✅ Items inserted successfully');
      }

      return invoiceId;
    },
    onSuccess: () => {
      // Invalidar sin refetch inmediato para no interrumpir la edición
      queryClient.invalidateQueries({ 
        queryKey: ['pending-invoices'],
        refetchType: 'none'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['client-invoices'],
        refetchType: 'none'
      });
      // No mostrar toast aquí - se maneja en el componente
    },
    onError: (error) => {
      console.error('Error saving invoice:', error);
      toast.error('Error al guardar la factura');
    },
  });
};

// Mutation to submit invoice for approval
export const useSubmitInvoiceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase
        .from('post_payment_invoices')
        .update({ 
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('id', invoiceId);

      if (error) throw error;
      return invoiceId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['client-invoices'] });
      toast.success('Factura enviada al cliente para aprobación');
    },
    onError: (error) => {
      console.error('Error submitting invoice:', error);
      toast.error('Error al enviar la factura');
    },
  });
};

// Hook to get unified paid invoices (from both tables)
export const usePaidInvoices = (providerId?: string) => {
  return useQuery({
    queryKey: ['paid-invoices', providerId],
    queryFn: async () => {
      if (!providerId) return [];

      // Get paid prepaid invoices
      const { data: prepaidInvoices, error: prepaidError } = await supabase
        .from('invoices')
        .select(`
          *,
          appointments!inner(
            id,
            start_time,
            client_name,
            listings!inner(title)
          )
        `)
        .eq('provider_id', providerId)
        .in('status', ['paid', 'completed'])
        .order('paid_at', { ascending: false });

      if (prepaidError) {
        console.error('Error fetching prepaid invoices:', prepaidError);
      }

      // Get approved post-payment invoices (approved = paid)
      const { data: postpaidInvoices, error: postpaidError } = await supabase
        .from('post_payment_invoices')
        .select(`
          *,
          appointments!inner(
            id,
            start_time,
            client_name,
            listings!inner(title)
          )
        `)
        .eq('provider_id', providerId)
        .eq('status', 'approved')
        .order('approved_at', { ascending: false });

      if (postpaidError) {
        console.error('Error fetching postpaid invoices:', postpaidError);
      }

      // Unify format
      const unifiedInvoices = [
        ...(prepaidInvoices || []).map(inv => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          type: 'prepaid' as const,
          appointment_id: inv.appointment_id,
          client_name: inv.appointments?.client_name || 'N/A',
          service_title: inv.appointments?.listings?.title || 'N/A',
          amount: inv.total_price,
          payment_date: inv.paid_at || inv.completed_at || inv.invoice_date,
          payment_method_id: inv.onvopay_payment_id,
          status: inv.status,
          created_at: inv.created_at
        })),
        ...(postpaidInvoices || []).map(inv => ({
          id: inv.id,
          invoice_number: `PP-${inv.id.slice(0, 8)}`,
          type: 'postpaid' as const,
          appointment_id: inv.appointment_id,
          client_name: inv.appointments?.client_name || 'N/A',
          service_title: inv.appointments?.listings?.title || 'N/A',
          amount: inv.total_price,
          payment_date: inv.approved_at || inv.created_at,
          payment_method_id: null,
          status: 'approved',
          created_at: inv.created_at
        }))
      ];

      // Sort by payment date
      return unifiedInvoices.sort((a, b) => 
        new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      );
    },
    enabled: !!providerId,
    refetchInterval: 30000,
  });
};

// Mutation for client to approve/reject invoice
export const useInvoiceApprovalMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      invoiceId, 
      approved, 
      rejectionReason 
    }: { 
      invoiceId: string; 
      approved: boolean; 
      rejectionReason?: string;
    }) => {
      // Get invoice details first
      const { data: invoice, error: fetchError } = await supabase
        .from('post_payment_invoices')
        .select('*, appointments!inner(id, final_price)')
        .eq('id', invoiceId)
        .single();

      if (fetchError) throw fetchError;

      const updateData: any = {
        status: approved ? 'approved' : 'rejected'
      };

      if (approved) {
        updateData.approved_at = new Date().toISOString();

        // 🔐 PASO 1: Crear y capturar pago T2 de gastos adicionales ANTES de actualizar el status
        console.log('💳 [CLIENT FLOW] Initiating T2 post-payment charge for invoice:', invoiceId);
        
        const { data: chargeData, error: chargeError } = await supabase.functions.invoke(
          'onvopay-charge-post-payment',
          {
            body: { invoiceId }
          }
        );

        if (chargeError || !chargeData?.success) {
          console.error('❌ [CLIENT FLOW] T2 charge failed:', chargeError || chargeData);
          throw new Error(chargeError?.message || chargeData?.error || 'Error procesando el pago adicional');
        }

        console.log('✅ [CLIENT FLOW] T2 payment charged successfully:', chargeData.payment_id);

        // 📊 PASO 2: Actualizar appointment con precio final
        console.log('📊 [CLIENT FLOW] Updating appointment final_price to:', invoice.total_price);
        const { error: appointmentError } = await supabase
          .from('appointments')
          .update({
            final_price: invoice.total_price,
            price_finalized: true
          })
          .eq('id', invoice.appointment_id);

        if (appointmentError) {
          console.error('❌ Error updating appointment price:', appointmentError);
        } else {
          console.log('✅ [CLIENT FLOW] Appointment final_price updated');
        }
      } else {
        updateData.rejected_at = new Date().toISOString();
        updateData.rejection_reason = rejectionReason;
        console.log('❌ [CLIENT FLOW] Invoice rejected with reason:', rejectionReason);
      }

      const { error } = await supabase
        .from('post_payment_invoices')
        .update(updateData)
        .eq('id', invoiceId);

      if (error) throw error;
      return invoiceId;
    },
    onSuccess: (_, { approved }) => {
      queryClient.invalidateQueries({ queryKey: ['pending-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['client-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['paid-invoices'] });
      toast.success(approved ? 'Factura aprobada y pagada' : 'Factura rechazada');
    },
    onError: (error) => {
      console.error('Error processing invoice approval:', error);
      toast.error('Error al procesar la respuesta');
    },
  });
};
