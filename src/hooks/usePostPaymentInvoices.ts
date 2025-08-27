
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
      if (!providerId) return [];

      // Get completed post-payment appointments that don't have invoices
      const { data: completedAppointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          listings!inner(
            id,
            title,
            base_price,
            is_post_payment
          )
        `)
        .eq('provider_id', providerId)
        .eq('status', 'completed')
        .eq('listings.is_post_payment', true)
        .lt('end_time', new Date().toISOString())
        .is('price_finalized', false);

      if (error) {
        console.error('Error fetching completed post-payment appointments:', error);
        return [];
      }

      if (!completedAppointments?.length) return [];

      // Check which appointments already have invoices
      const appointmentIds = completedAppointments.map(apt => apt.id);
      const { data: existingInvoices } = await supabase
        .from('post_payment_invoices')
        .select('appointment_id')
        .in('appointment_id', appointmentIds);

      const existingInvoiceAppointmentIds = new Set(
        existingInvoices?.map(inv => inv.appointment_id) || []
      );

      // Create draft invoices for appointments that don't have them
      const appointmentsNeedingInvoices = completedAppointments.filter(
        apt => !existingInvoiceAppointmentIds.has(apt.id)
      );

      for (const appointment of appointmentsNeedingInvoices) {
        try {
          await supabase.from('post_payment_invoices').insert({
            appointment_id: appointment.id,
            provider_id: providerId,
            client_id: appointment.client_id,
            base_price: appointment.listings.base_price,
            total_price: appointment.listings.base_price,
            status: 'draft'
          });

          console.log(`Auto-created invoice for appointment ${appointment.id}`);
        } catch (error) {
          console.error(`Error creating auto-invoice for appointment ${appointment.id}:`, error);
        }
      }

      // Invalidate related queries to trigger refetch
      if (appointmentsNeedingInvoices.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['pending-invoices'] });
      }

      return appointmentsNeedingInvoices;
    },
    enabled: !!providerId,
    refetchInterval: 60000, // Check every minute for new completed services
  });
};

// Hook for providers to get their pending invoices
export const usePendingInvoices = (providerId?: string) => {
  // Auto-create invoices for completed post-payment services
  useAutoCreatePostPaymentInvoices(providerId);

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
        .in('status', ['draft', 'rejected'])
        .order('created_at', { ascending: true });

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

      // Delete existing items if updating
      if ('id' in invoiceData && invoiceData.id) {
        await supabase
          .from('post_payment_items')
          .delete()
          .eq('invoice_id', invoiceId);
      }

      // Process and insert new items
      const itemsToInsert = [];
      for (const item of items) {
        let evidenceUrl = null;

        // Upload evidence file if provided
        if (item.evidenceFile) {
          const fileName = `${invoiceId}_${Date.now()}_${item.evidenceFile.name}`;
          
          const { error: uploadError } = await supabase.storage
            .from('service-gallery')
            .upload(`invoices/${fileName}`, item.evidenceFile);

          if (uploadError) {
            console.error('Error uploading evidence file:', uploadError);
          } else {
            const { data: urlData } = supabase.storage
              .from('service-gallery')
              .getPublicUrl(`invoices/${fileName}`);
            evidenceUrl = urlData.publicUrl;
          }
        }

        itemsToInsert.push({
          invoice_id: invoiceId,
          item_name: item.item_name,
          description: item.description || null,
          amount: item.amount,
          evidence_file_url: evidenceUrl
        });
      }

      // Insert new items
      if (itemsToInsert.length > 0) {
        const { error } = await supabase
          .from('post_payment_items')
          .insert(itemsToInsert);
        
        if (error) throw error;
      }

      return invoiceId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['client-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-items'] });
      toast.success('Factura guardada exitosamente');
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
      const updateData: any = {
        status: approved ? 'approved' : 'rejected'
      };

      if (approved) {
        updateData.approved_at = new Date().toISOString();
      } else {
        updateData.rejected_at = new Date().toISOString();
        updateData.rejection_reason = rejectionReason;
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
      toast.success(approved ? 'Factura aprobada' : 'Factura rechazada');
    },
    onError: (error) => {
      console.error('Error processing invoice approval:', error);
      toast.error('Error al procesar la respuesta');
    },
  });
};
