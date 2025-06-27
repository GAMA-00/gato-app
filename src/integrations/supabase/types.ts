export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          admin_notes: string | null
          cancellation_time: string | null
          client_address: string | null
          client_email: string | null
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          end_time: string
          external_booking: boolean | null
          final_price: number | null
          id: string
          is_recurring_instance: boolean | null
          last_modified_at: string | null
          last_modified_by: string | null
          listing_id: string
          notes: string | null
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
          cancellation_time?: string | null
          client_address?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          end_time: string
          external_booking?: boolean | null
          final_price?: number | null
          id?: string
          is_recurring_instance?: boolean | null
          last_modified_at?: string | null
          last_modified_by?: string | null
          listing_id: string
          notes?: string | null
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
          cancellation_time?: string | null
          client_address?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          end_time?: string
          external_booking?: boolean | null
          final_price?: number | null
          id?: string
          is_recurring_instance?: boolean | null
          last_modified_at?: string | null
          last_modified_by?: string | null
          listing_id?: string
          notes?: string | null
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
            foreignKeyName: "appointments_recurring_rule_id_fkey"
            columns: ["recurring_rule_id"]
            isOneToOne: false
            referencedRelation: "recurring_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_time_slots: {
        Row: {
          created_at: string | null
          day: number
          end_hour: number
          id: string
          is_recurring: boolean | null
          note: string | null
          provider_id: string
          recurrence_type: string | null
          start_hour: number
        }
        Insert: {
          created_at?: string | null
          day: number
          end_hour: number
          id?: string
          is_recurring?: boolean | null
          note?: string | null
          provider_id: string
          recurrence_type?: string | null
          start_hour: number
        }
        Update: {
          created_at?: string | null
          day?: number
          end_hour?: number
          id?: string
          is_recurring?: boolean | null
          note?: string | null
          provider_id?: string
          recurrence_type?: string | null
          start_hour?: number
        }
        Relationships: [
          {
            foreignKeyName: "blocked_time_slots_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "clients_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_time_slots_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_time_slots_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          base_price: number
          created_at: string
          description: string
          duration: number
          gallery_images: Json | null
          id: string
          is_active: boolean | null
          is_post_payment: boolean
          provider_id: string
          service_type_id: string
          service_variants: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          base_price: number
          created_at?: string
          description: string
          duration: number
          gallery_images?: Json | null
          id?: string
          is_active?: boolean | null
          is_post_payment?: boolean
          provider_id: string
          service_type_id: string
          service_variants?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          created_at?: string
          description?: string
          duration?: number
          gallery_images?: Json | null
          id?: string
          is_active?: boolean | null
          is_post_payment?: boolean
          provider_id?: string
          service_type_id?: string
          service_variants?: Json | null
          title?: string
          updated_at?: string
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
      calculate_refund_percentage: {
        Args: { cancellation_time: string; appointment_start: string }
        Returns: number
      }
      check_recurring_availability: {
        Args: {
          p_provider_id: string
          p_start_time: string
          p_end_time: string
          p_exclude_rule_id?: string
        }
        Returns: boolean
      }
      create_user_profile: {
        Args: {
          user_id: string
          user_name: string
          user_email: string
          user_phone: string
          user_role: string
          user_residencia_id?: string
        }
        Returns: undefined
      }
      extend_recurring_instances: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      generate_recurring_appointment_instances: {
        Args: { p_rule_id: string; p_weeks_ahead?: number }
        Returns: number
      }
      generate_recurring_instances: {
        Args: { rule_id: string; start_range: string; end_range: string }
        Returns: number
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
      recalculate_all_provider_ratings: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      submit_provider_rating: {
        Args: {
          p_provider_id: string
          p_client_id: string
          p_appointment_id: string
          p_rating: number
        }
        Returns: undefined
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
