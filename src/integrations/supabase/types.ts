export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          admin_notes: string | null
          cancellation_reason: string | null
          cancellation_time: string | null
          client_address: string | null
          client_email: string | null
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          custom_variable_selections: Json | null
          custom_variables_total_price: number | null
          end_time: string
          external_booking: boolean | null
          final_price: number | null
          id: string
          is_recurring_instance: boolean | null
          last_modified_at: string | null
          last_modified_by: string | null
          listing_id: string
          notes: string | null
          onvopay_payment_id: string | null
          price_finalized: boolean | null
          provider_id: string
          provider_name: string | null
          recurrence: string | null
          recurrence_group_id: string | null
          recurring_rule_id: string | null
          refund_percentage: number | null
          residencia_id: string | null
          start_time: string
          status: string
          stripe_payment_intent_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          cancellation_reason?: string | null
          cancellation_time?: string | null
          client_address?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          custom_variable_selections?: Json | null
          custom_variables_total_price?: number | null
          end_time: string
          external_booking?: boolean | null
          final_price?: number | null
          id?: string
          is_recurring_instance?: boolean | null
          last_modified_at?: string | null
          last_modified_by?: string | null
          listing_id: string
          notes?: string | null
          onvopay_payment_id?: string | null
          price_finalized?: boolean | null
          provider_id: string
          provider_name?: string | null
          recurrence?: string | null
          recurrence_group_id?: string | null
          recurring_rule_id?: string | null
          refund_percentage?: number | null
          residencia_id?: string | null
          start_time: string
          status: string
          stripe_payment_intent_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          cancellation_reason?: string | null
          cancellation_time?: string | null
          client_address?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          custom_variable_selections?: Json | null
          custom_variables_total_price?: number | null
          end_time?: string
          external_booking?: boolean | null
          final_price?: number | null
          id?: string
          is_recurring_instance?: boolean | null
          last_modified_at?: string | null
          last_modified_by?: string | null
          listing_id?: string
          notes?: string | null
          onvopay_payment_id?: string | null
          price_finalized?: boolean | null
          provider_id?: string
          provider_name?: string | null
          recurrence?: string | null
          recurrence_group_id?: string | null
          recurring_rule_id?: string | null
          refund_percentage?: number | null
          residencia_id?: string | null
          start_time?: string
          status?: string
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_onvopay_payment_id_fkey"
            columns: ["onvopay_payment_id"]
            isOneToOne: false
            referencedRelation: "onvopay_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_recurring_rule_id_fkey"
            columns: ["recurring_rule_id"]
            isOneToOne: false
            referencedRelation: "recurring_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellation_policies: {
        Row: {
          created_at: string
          hours_before: number
          id: string
          refund_percentage: number
        }
        Insert: {
          created_at?: string
          hours_before: number
          id?: string
          refund_percentage: number
        }
        Update: {
          created_at?: string
          hours_before?: number
          id?: string
          refund_percentage?: number
        }
        Relationships: []
      }
      condominiums: {
        Row: {
          created_at: string
          id: string
          name: string
          residencia_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          residencia_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          residencia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "condominiums_residencia_id_fkey"
            columns: ["residencia_id"]
            isOneToOne: false
            referencedRelation: "residencias"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_residencias: {
        Row: {
          created_at: string
          listing_id: string
          residencia_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          residencia_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          residencia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_residencias_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_residencias_residencia_id_fkey"
            columns: ["residencia_id"]
            isOneToOne: false
            referencedRelation: "residencias"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          availability: Json | null
          base_price: number
          created_at: string
          custom_variable_groups: Json | null
          description: string
          duration: number
          gallery_images: Json | null
          id: string
          is_active: boolean | null
          is_post_payment: boolean
          provider_id: string
          service_type_id: string
          service_variants: Json | null
          slot_preferences: Json
          standard_duration: number
          title: string
          updated_at: string
          use_custom_variables: boolean | null
        }
        Insert: {
          availability?: Json | null
          base_price: number
          created_at?: string
          custom_variable_groups?: Json | null
          description: string
          duration: number
          gallery_images?: Json | null
          id?: string
          is_active?: boolean | null
          is_post_payment?: boolean
          provider_id: string
          service_type_id: string
          service_variants?: Json | null
          slot_preferences?: Json
          standard_duration: number
          title: string
          updated_at?: string
          use_custom_variables?: boolean | null
        }
        Update: {
          availability?: Json | null
          base_price?: number
          created_at?: string
          custom_variable_groups?: Json | null
          description?: string
          duration?: number
          gallery_images?: Json | null
          id?: string
          is_active?: boolean | null
          is_post_payment?: boolean
          provider_id?: string
          service_type_id?: string
          service_variants?: Json | null
          slot_preferences?: Json
          standard_duration?: number
          title?: string
          updated_at?: string
          use_custom_variables?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      onvopay_customers: {
        Row: {
          client_id: string
          created_at: string
          customer_data: Json
          id: string
          normalized_email: string | null
          normalized_name: string | null
          normalized_phone: string | null
          onvopay_customer_id: string
          synced_at: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          customer_data?: Json
          id?: string
          normalized_email?: string | null
          normalized_name?: string | null
          normalized_phone?: string | null
          onvopay_customer_id: string
          synced_at?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          customer_data?: Json
          id?: string
          normalized_email?: string | null
          normalized_name?: string | null
          normalized_phone?: string | null
          onvopay_customer_id?: string
          synced_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onvopay_customers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onvopay_customers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "providers_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onvopay_customers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      onvopay_payments: {
        Row: {
          amount: number
          appointment_id: string
          authorized_at: string | null
          billing_info: Json
          cancelled_at: string | null
          captured_at: string | null
          card_info: Json | null
          client_id: string
          commission_amount: number
          created_at: string
          currency: string
          error_details: Json | null
          external_reference: string | null
          failed_at: string | null
          id: string
          iva_amount: number
          legacy_stripe_payment_intent_id: string | null
          migration_notes: Json | null
          onvopay_payment_id: string | null
          onvopay_response: Json | null
          onvopay_transaction_id: string | null
          payment_method: string
          payment_type: string
          provider_id: string
          retry_count: number | null
          status: string
          subtotal: number
        }
        Insert: {
          amount: number
          appointment_id: string
          authorized_at?: string | null
          billing_info?: Json
          cancelled_at?: string | null
          captured_at?: string | null
          card_info?: Json | null
          client_id: string
          commission_amount?: number
          created_at?: string
          currency?: string
          error_details?: Json | null
          external_reference?: string | null
          failed_at?: string | null
          id?: string
          iva_amount: number
          legacy_stripe_payment_intent_id?: string | null
          migration_notes?: Json | null
          onvopay_payment_id?: string | null
          onvopay_response?: Json | null
          onvopay_transaction_id?: string | null
          payment_method?: string
          payment_type: string
          provider_id: string
          retry_count?: number | null
          status?: string
          subtotal: number
        }
        Update: {
          amount?: number
          appointment_id?: string
          authorized_at?: string | null
          billing_info?: Json
          cancelled_at?: string | null
          captured_at?: string | null
          card_info?: Json | null
          client_id?: string
          commission_amount?: number
          created_at?: string
          currency?: string
          error_details?: Json | null
          external_reference?: string | null
          failed_at?: string | null
          id?: string
          iva_amount?: number
          legacy_stripe_payment_intent_id?: string | null
          migration_notes?: Json | null
          onvopay_payment_id?: string | null
          onvopay_response?: Json | null
          onvopay_transaction_id?: string | null
          payment_method?: string
          payment_type?: string
          provider_id?: string
          retry_count?: number | null
          status?: string
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "onvopay_payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onvopay_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onvopay_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "providers_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onvopay_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onvopay_payments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "clients_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onvopay_payments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onvopay_payments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      onvopay_subscriptions: {
        Row: {
          amount: number
          cancelled_at: string | null
          client_id: string
          created_at: string
          external_reference: string | null
          failed_attempts: number | null
          id: string
          inherit_original_data: boolean
          interval_count: number
          interval_type: string
          last_charge_date: string | null
          last_failure_reason: string | null
          max_retry_attempts: number | null
          next_charge_date: string
          onvopay_subscription_id: string | null
          original_appointment_template: Json | null
          provider_id: string
          recurring_rule_id: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          cancelled_at?: string | null
          client_id: string
          created_at?: string
          external_reference?: string | null
          failed_attempts?: number | null
          id?: string
          inherit_original_data?: boolean
          interval_count?: number
          interval_type: string
          last_charge_date?: string | null
          last_failure_reason?: string | null
          max_retry_attempts?: number | null
          next_charge_date: string
          onvopay_subscription_id?: string | null
          original_appointment_template?: Json | null
          provider_id: string
          recurring_rule_id?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          cancelled_at?: string | null
          client_id?: string
          created_at?: string
          external_reference?: string | null
          failed_attempts?: number | null
          id?: string
          inherit_original_data?: boolean
          interval_count?: number
          interval_type?: string
          last_charge_date?: string | null
          last_failure_reason?: string | null
          max_retry_attempts?: number | null
          next_charge_date?: string
          onvopay_subscription_id?: string | null
          original_appointment_template?: Json | null
          provider_id?: string
          recurring_rule_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onvopay_subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onvopay_subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "providers_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onvopay_subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onvopay_subscriptions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "clients_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onvopay_subscriptions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onvopay_subscriptions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onvopay_subscriptions_recurring_rule_id_fkey"
            columns: ["recurring_rule_id"]
            isOneToOne: false
            referencedRelation: "recurring_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      onvopay_webhooks: {
        Row: {
          error_details: Json | null
          event_type: string
          id: string
          is_duplicate: boolean
          is_unexpected_event: boolean
          onvopay_event_id: string
          payment_id: string | null
          processed: boolean
          processed_at: string | null
          processing_result: Json | null
          received_at: string
          retry_count: number | null
          subscription_id: string | null
          webhook_data: Json
        }
        Insert: {
          error_details?: Json | null
          event_type: string
          id?: string
          is_duplicate?: boolean
          is_unexpected_event?: boolean
          onvopay_event_id: string
          payment_id?: string | null
          processed?: boolean
          processed_at?: string | null
          processing_result?: Json | null
          received_at?: string
          retry_count?: number | null
          subscription_id?: string | null
          webhook_data?: Json
        }
        Update: {
          error_details?: Json | null
          event_type?: string
          id?: string
          is_duplicate?: boolean
          is_unexpected_event?: boolean
          onvopay_event_id?: string
          payment_id?: string | null
          processed?: boolean
          processed_at?: string | null
          processing_result?: Json | null
          received_at?: string
          retry_count?: number | null
          subscription_id?: string | null
          webhook_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "onvopay_webhooks_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "onvopay_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onvopay_webhooks_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "onvopay_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          account_holder: string | null
          account_number: string | null
          bank_name: string | null
          card_number: string | null
          cardholder_name: string | null
          created_at: string
          expiry_date: string | null
          id: string
          method_type: string
          sinpe_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          bank_name?: string | null
          card_number?: string | null
          cardholder_name?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          method_type: string
          sinpe_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          bank_name?: string | null
          card_number?: string | null
          cardholder_name?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          method_type?: string
          sinpe_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "clients_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "providers_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      post_payment_evidence: {
        Row: {
          appointment_id: string
          created_at: string
          description: string | null
          file_type: string
          file_url: string
          id: string
          provider_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          description?: string | null
          file_type: string
          file_url: string
          id?: string
          provider_id: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          description?: string | null
          file_type?: string
          file_url?: string
          id?: string
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_payment_evidence_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      post_payment_invoices: {
        Row: {
          appointment_id: string
          approved_at: string | null
          base_price: number
          client_id: string
          created_at: string
          evidence_file_url: string | null
          id: string
          provider_id: string
          rejected_at: string | null
          rejection_reason: string | null
          status: string
          submitted_at: string | null
          total_price: number
          updated_at: string
        }
        Insert: {
          appointment_id: string
          approved_at?: string | null
          base_price: number
          client_id: string
          created_at?: string
          evidence_file_url?: string | null
          id?: string
          provider_id: string
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
          total_price?: number
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          approved_at?: string | null
          base_price?: number
          client_id?: string
          created_at?: string
          evidence_file_url?: string | null
          id?: string
          provider_id?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_payment_invoices_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      post_payment_items: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          evidence_file_url: string | null
          id: string
          invoice_id: string
          item_name: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          evidence_file_url?: string | null
          id?: string
          invoice_id: string
          item_name?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          evidence_file_url?: string | null
          id?: string
          invoice_id?: string
          item_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_payment_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "post_payment_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          amount: number
          appointment_id: string
          client_id: string
          created_at: string
          id: string
          listing_id: string
          provider_id: string
        }
        Insert: {
          amount: number
          appointment_id: string
          client_id: string
          created_at?: string
          id?: string
          listing_id: string
          provider_id: string
        }
        Update: {
          amount?: number
          appointment_id?: string
          client_id?: string
          created_at?: string
          id?: string
          listing_id?: string
          provider_id?: string
        }
        Relationships: []
      }
      provider_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          provider_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          provider_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          provider_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "clients_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_ratings: {
        Row: {
          appointment_id: string
          client_id: string
          comment: string | null
          created_at: string
          id: string
          provider_id: string
          rating: number
        }
        Insert: {
          appointment_id: string
          client_id: string
          comment?: string | null
          created_at?: string
          id?: string
          provider_id: string
          rating: number
        }
        Update: {
          appointment_id?: string
          client_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          provider_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "provider_ratings_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_residencias: {
        Row: {
          created_at: string
          provider_id: string
          residencia_id: string
        }
        Insert: {
          created_at?: string
          provider_id: string
          residencia_id: string
        }
        Update: {
          created_at?: string
          provider_id?: string
          residencia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_residencias_residencia_id_fkey"
            columns: ["residencia_id"]
            isOneToOne: false
            referencedRelation: "residencias"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_slot_preferences: {
        Row: {
          created_at: string
          id: string
          is_manually_disabled: boolean
          listing_id: string
          provider_id: string
          slot_pattern: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_manually_disabled?: boolean
          listing_id: string
          provider_id: string
          slot_pattern: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_manually_disabled?: boolean
          listing_id?: string
          provider_id?: string
          slot_pattern?: string
          updated_at?: string
        }
        Relationships: []
      }
      provider_time_slots: {
        Row: {
          blocked_until: string | null
          created_at: string
          end_time: string
          id: string
          is_available: boolean
          is_reserved: boolean
          listing_id: string
          provider_id: string
          recurring_blocked: boolean | null
          recurring_rule_id: string | null
          slot_date: string
          slot_datetime_end: string
          slot_datetime_start: string
          slot_type: string | null
          start_time: string
        }
        Insert: {
          blocked_until?: string | null
          created_at?: string
          end_time: string
          id?: string
          is_available?: boolean
          is_reserved?: boolean
          listing_id: string
          provider_id: string
          recurring_blocked?: boolean | null
          recurring_rule_id?: string | null
          slot_date: string
          slot_datetime_end: string
          slot_datetime_start: string
          slot_type?: string | null
          start_time: string
        }
        Update: {
          blocked_until?: string | null
          created_at?: string
          end_time?: string
          id?: string
          is_available?: boolean
          is_reserved?: boolean
          listing_id?: string
          provider_id?: string
          recurring_blocked?: boolean | null
          recurring_rule_id?: string | null
          slot_date?: string
          slot_datetime_end?: string
          slot_datetime_start?: string
          slot_type?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_time_slots_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_time_slots_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "clients_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_time_slots_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_time_slots_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_time_slots_recurring_rule_id_fkey"
            columns: ["recurring_rule_id"]
            isOneToOne: false
            referencedRelation: "recurring_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_appointment_instances: {
        Row: {
          created_at: string
          end_time: string
          id: string
          instance_date: string
          notes: string | null
          recurring_rule_id: string
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          instance_date: string
          notes?: string | null
          recurring_rule_id: string
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          instance_date?: string
          notes?: string | null
          recurring_rule_id?: string
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_appointment_instances_recurring_rule_id_fkey"
            columns: ["recurring_rule_id"]
            isOneToOne: false
            referencedRelation: "recurring_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_exceptions: {
        Row: {
          action_type: string
          appointment_id: string
          created_at: string
          exception_date: string
          id: string
          new_end_time: string | null
          new_start_time: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          action_type: string
          appointment_id: string
          created_at?: string
          exception_date: string
          id?: string
          new_end_time?: string | null
          new_start_time?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          action_type?: string
          appointment_id?: string
          created_at?: string
          exception_date?: string
          id?: string
          new_end_time?: string | null
          new_start_time?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_exceptions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_instances: {
        Row: {
          created_at: string
          end_time: string
          id: string
          instance_date: string
          notes: string | null
          recurring_rule_id: string
          start_time: string
          status: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          instance_date: string
          notes?: string | null
          recurring_rule_id: string
          start_time: string
          status?: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          instance_date?: string
          notes?: string | null
          recurring_rule_id?: string
          start_time?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_instances_recurring_rule_id_fkey"
            columns: ["recurring_rule_id"]
            isOneToOne: false
            referencedRelation: "recurring_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_rules: {
        Row: {
          apartment: string | null
          client_address: string | null
          client_email: string | null
          client_id: string
          client_name: string | null
          client_phone: string | null
          created_at: string
          day_of_month: number | null
          day_of_week: number | null
          end_time: string
          id: string
          is_active: boolean
          listing_id: string
          notes: string | null
          provider_id: string
          recurrence_type: string
          start_date: string
          start_time: string
          updated_at: string
        }
        Insert: {
          apartment?: string | null
          client_address?: string | null
          client_email?: string | null
          client_id: string
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          end_time: string
          id?: string
          is_active?: boolean
          listing_id: string
          notes?: string | null
          provider_id: string
          recurrence_type: string
          start_date: string
          start_time: string
          updated_at?: string
        }
        Update: {
          apartment?: string | null
          client_address?: string | null
          client_email?: string | null
          client_id?: string
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          day_of_month?: number | null
          day_of_week?: number | null
          end_time?: string
          id?: string
          is_active?: boolean
          listing_id?: string
          notes?: string | null
          provider_id?: string
          recurrence_type?: string
          start_date?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      residencias: {
        Row: {
          address: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          created_at: string
          icon: string
          id: string
          label: string
          name: string
        }
        Insert: {
          created_at?: string
          icon: string
          id?: string
          label: string
          name: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          label?: string
          name?: string
        }
        Relationships: []
      }
      service_types: {
        Row: {
          category_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_types_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          commission_rate: number
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          commission_rate?: number
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          commission_rate?: number
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          cedula: string
          created_at: string
          criminal_record_file_url: string | null
          id: string
          name: string
          phone: string
          photo_url: string | null
          position_order: number
          provider_id: string
          role: string
          updated_at: string
        }
        Insert: {
          cedula: string
          created_at?: string
          criminal_record_file_url?: string | null
          id?: string
          name: string
          phone: string
          photo_url?: string | null
          position_order?: number
          provider_id: string
          role?: string
          updated_at?: string
        }
        Update: {
          cedula?: string
          created_at?: string
          criminal_record_file_url?: string | null
          id?: string
          name?: string
          phone?: string
          photo_url?: string | null
          position_order?: number
          provider_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "clients_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          about_me: string | null
          avatar_url: string | null
          average_rating: number | null
          certification_files: Json | null
          condominium_id: string | null
          condominium_name: string | null
          condominium_text: string | null
          created_at: string | null
          email: string | null
          experience_years: number | null
          has_certifications: boolean | null
          has_payment_method: boolean | null
          house_number: string | null
          id: string
          name: string | null
          phone: string | null
          residencia_id: string | null
          role: string
        }
        Insert: {
          about_me?: string | null
          avatar_url?: string | null
          average_rating?: number | null
          certification_files?: Json | null
          condominium_id?: string | null
          condominium_name?: string | null
          condominium_text?: string | null
          created_at?: string | null
          email?: string | null
          experience_years?: number | null
          has_certifications?: boolean | null
          has_payment_method?: boolean | null
          house_number?: string | null
          id: string
          name?: string | null
          phone?: string | null
          residencia_id?: string | null
          role: string
        }
        Update: {
          about_me?: string | null
          avatar_url?: string | null
          average_rating?: number | null
          certification_files?: Json | null
          condominium_id?: string | null
          condominium_name?: string | null
          condominium_text?: string | null
          created_at?: string | null
          email?: string | null
          experience_years?: number | null
          has_certifications?: boolean | null
          has_payment_method?: boolean | null
          house_number?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          residencia_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_residencia_id_fkey"
            columns: ["residencia_id"]
            isOneToOne: false
            referencedRelation: "residencias"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      clients_view: {
        Row: {
          about_me: string | null
          avatar_url: string | null
          average_rating: number | null
          certification_files: Json | null
          condominium_id: string | null
          created_at: string | null
          email: string | null
          experience_years: number | null
          has_payment_method: boolean | null
          house_number: string | null
          id: string | null
          name: string | null
          phone: string | null
          residencia_id: string | null
          role: string | null
        }
        Insert: {
          about_me?: string | null
          avatar_url?: string | null
          average_rating?: number | null
          certification_files?: Json | null
          condominium_id?: string | null
          created_at?: string | null
          email?: string | null
          experience_years?: number | null
          has_payment_method?: boolean | null
          house_number?: string | null
          id?: string | null
          name?: string | null
          phone?: string | null
          residencia_id?: string | null
          role?: string | null
        }
        Update: {
          about_me?: string | null
          avatar_url?: string | null
          average_rating?: number | null
          certification_files?: Json | null
          condominium_id?: string | null
          created_at?: string | null
          email?: string | null
          experience_years?: number | null
          has_payment_method?: boolean | null
          house_number?: string | null
          id?: string | null
          name?: string | null
          phone?: string | null
          residencia_id?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_residencia_id_fkey"
            columns: ["residencia_id"]
            isOneToOne: false
            referencedRelation: "residencias"
            referencedColumns: ["id"]
          },
        ]
      }
      providers_view: {
        Row: {
          about_me: string | null
          avatar_url: string | null
          average_rating: number | null
          certification_files: Json | null
          condominium_id: string | null
          created_at: string | null
          email: string | null
          experience_years: number | null
          has_payment_method: boolean | null
          house_number: string | null
          id: string | null
          name: string | null
          phone: string | null
          residencia_id: string | null
          role: string | null
        }
        Insert: {
          about_me?: string | null
          avatar_url?: string | null
          average_rating?: number | null
          certification_files?: Json | null
          condominium_id?: string | null
          created_at?: string | null
          email?: string | null
          experience_years?: number | null
          has_payment_method?: boolean | null
          house_number?: string | null
          id?: string | null
          name?: string | null
          phone?: string | null
          residencia_id?: string | null
          role?: string | null
        }
        Update: {
          about_me?: string | null
          avatar_url?: string | null
          average_rating?: number | null
          certification_files?: Json | null
          condominium_id?: string | null
          created_at?: string | null
          email?: string | null
          experience_years?: number | null
          has_payment_method?: boolean | null
          house_number?: string | null
          id?: string | null
          name?: string | null
          phone?: string | null
          residencia_id?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_residencia_id_fkey"
            columns: ["residencia_id"]
            isOneToOne: false
            referencedRelation: "residencias"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      advance_recurring_appointment: {
        Args: { p_appointment_id: string }
        Returns: undefined
      }
      auto_rate_old_appointments: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      block_recurring_slots: {
        Args: { p_months_ahead?: number; p_recurring_rule_id: string }
        Returns: number
      }
      block_recurring_slots_for_appointment: {
        Args: { p_appointment_id: string; p_months_ahead?: number }
        Returns: number
      }
      calculate_next_occurrence_sql: {
        Args: {
          original_date: string
          recurrence_type: string
          reference_date?: string
        }
        Returns: string
      }
      calculate_refund_percentage: {
        Args: { appointment_start: string; cancellation_time: string }
        Returns: number
      }
      can_update_user_role: {
        Args: { new_role: string; target_user_id: string }
        Returns: boolean
      }
      check_recurring_availability: {
        Args: {
          p_end_time: string
          p_exclude_rule_id?: string
          p_provider_id: string
          p_start_time: string
        }
        Returns: boolean
      }
      clean_duplicate_slots: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_and_regenerate_slots: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      consolidate_multiple_listings: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      create_appointment_with_slot: {
        Args: {
          p_client_address?: string
          p_client_email?: string
          p_client_id: string
          p_client_name?: string
          p_client_phone?: string
          p_end_time: string
          p_listing_id: string
          p_notes?: string
          p_provider_id: string
          p_recurrence?: string
          p_residencia_id?: string
          p_start_time: string
        }
        Returns: {
          appointment_id: string
          message: string
          status: string
        }[]
      }
      create_appointment_with_slot_extended: {
        Args: {
          p_client_address?: string
          p_client_email?: string
          p_client_id: string
          p_client_name?: string
          p_client_phone?: string
          p_end_time: string
          p_listing_id: string
          p_notes?: string
          p_provider_id: string
          p_recurrence?: string
          p_residencia_id?: string
          p_selected_slot_ids?: string[]
          p_start_time: string
          p_total_duration?: number
        }
        Returns: {
          appointment_id: string
          status: string
        }[]
      }
      create_user_profile: {
        Args: {
          user_email: string
          user_id: string
          user_name: string
          user_phone: string
          user_residencia_id?: string
          user_role: string
        }
        Returns: undefined
      }
      debug_slot_generation: {
        Args: { p_listing_id: string }
        Returns: {
          debug_info: string
          debug_value: string
        }[]
      }
      extend_recurring_instances: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      fix_avatar_mime_types: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      fix_empty_avatars: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      fix_missing_slots_for_provider: {
        Args: { p_listing_id: string; p_provider_id: string }
        Returns: number
      }
      fix_provider_slot_consistency: {
        Args: { p_listing_id?: string; p_provider_id: string }
        Returns: number
      }
      fix_triweekly_blocked_slots: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      generate_all_provider_time_slots: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      generate_provider_time_slots: {
        Args:
          | {
              p_days_of_week: string[]
              p_end_date: string
              p_end_time: string
              p_listing_id: string
              p_provider_id: string
              p_slot_duration_minutes: number
              p_start_date: string
              p_start_time: string
            }
          | {
              p_end_date: string
              p_listing_id: string
              p_provider_id: string
              p_start_date: string
            }
        Returns: number
      }
      generate_provider_time_slots_for_listing: {
        Args: {
          p_listing_id: string
          p_provider_id: string
          p_weeks_ahead?: number
        }
        Returns: number
      }
      generate_recurring_appointment_instances: {
        Args: { p_rule_id: string; p_weeks_ahead?: number }
        Returns: number
      }
      generate_recurring_instances: {
        Args: { end_range: string; rule_id: string; start_range: string }
        Returns: number
      }
      get_provider_achievements_data: {
        Args: { p_provider_id: string }
        Returns: {
          average_rating: number
          completed_jobs_count: number
          recurring_clients_count: number
          total_ratings: number
        }[]
      }
      get_provider_listing: {
        Args: { p_provider_id: string }
        Returns: string
      }
      get_provider_payments_stats: {
        Args: { p_provider_id: string }
        Returns: {
          active_subscriptions: number
          commission_owed: number
          monthly_total: number
          pending_count: number
        }[]
      }
      get_rated_appointments: {
        Args: { appointment_ids: string[] }
        Returns: {
          appointment_id: string
        }[]
      }
      get_recurring_clients_count: {
        Args: { provider_id: string }
        Returns: number
      }
      get_recurring_clients_count_by_listing: {
        Args: { listing_id: string; provider_id: string }
        Returns: number
      }
      mark_past_appointments_completed: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      migrate_all_provider_availability_and_generate_slots: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      migrate_existing_recurring_appointments: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      needs_price_finalization: {
        Args: {
          appointment_row: Database["public"]["Tables"]["appointments"]["Row"]
        }
        Returns: boolean
      }
      recalculate_all_provider_ratings: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      regenerate_slots_for_listing: {
        Args: { p_listing_id: string }
        Returns: number
      }
      regenerate_slots_for_listing_safe: {
        Args: { p_listing_id: string }
        Returns: number
      }
      submit_provider_rating: {
        Args:
          | {
              p_appointment_id: string
              p_client_id: string
              p_comment?: string
              p_provider_id: string
              p_rating: number
            }
          | {
              p_appointment_id: string
              p_client_id: string
              p_provider_id: string
              p_rating: number
            }
        Returns: undefined
      }
      sync_provider_availability_from_listing: {
        Args: { p_listing_id: string }
        Returns: number
      }
      unblock_recurring_slots: {
        Args: { p_recurring_rule_id: string }
        Returns: number
      }
      unblock_recurring_slots_for_appointment: {
        Args: { p_appointment_id: string }
        Returns: number
      }
      validate_provider_slots_coverage: {
        Args: { p_listing_id: string; p_provider_id: string }
        Returns: {
          day_name: string
          expected_enabled: boolean
          has_slots: boolean
          missing_slots: boolean
          slots_count: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
