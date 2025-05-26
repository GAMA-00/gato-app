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
          apartment: string | null
          cancellation_time: string | null
          client_id: string
          client_name: string | null
          created_at: string
          end_time: string
          id: string
          last_modified_at: string | null
          last_modified_by: string | null
          listing_id: string
          notes: string | null
          provider_id: string
          provider_name: string | null
          recurrence: string | null
          refund_percentage: number | null
          residencia_id: string
          start_time: string
          status: string
        }
        Insert: {
          admin_notes?: string | null
          apartment?: string | null
          cancellation_time?: string | null
          client_id: string
          client_name?: string | null
          created_at?: string
          end_time: string
          id?: string
          last_modified_at?: string | null
          last_modified_by?: string | null
          listing_id: string
          notes?: string | null
          provider_id: string
          provider_name?: string | null
          recurrence?: string | null
          refund_percentage?: number | null
          residencia_id: string
          start_time: string
          status: string
        }
        Update: {
          admin_notes?: string | null
          apartment?: string | null
          cancellation_time?: string | null
          client_id?: string
          client_name?: string | null
          created_at?: string
          end_time?: string
          id?: string
          last_modified_at?: string | null
          last_modified_by?: string | null
          listing_id?: string
          notes?: string | null
          provider_id?: string
          provider_name?: string | null
          recurrence?: string | null
          refund_percentage?: number | null
          residencia_id?: string
          start_time?: string
          status?: string
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
            foreignKeyName: "appointments_residencia_id_fkey"
            columns: ["residencia_id"]
            isOneToOne: false
            referencedRelation: "residencias"
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
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_image: boolean | null
          read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_image?: boolean | null
          read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_image?: boolean | null
          read?: boolean | null
          receiver_id?: string
          sender_id?: string
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
      conversations: {
        Row: {
          client_id: string
          created_at: string
          id: string
          last_message: string | null
          last_message_time: string | null
          provider_id: string
          unread_count: number | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id: string
          last_message?: string | null
          last_message_time?: string | null
          provider_id: string
          unread_count?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_time?: string | null
          provider_id?: string
          unread_count?: number | null
        }
        Relationships: []
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
      users: {
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
      get_rated_appointments: {
        Args: { appointment_ids: string[] }
        Returns: {
          appointment_id: string
        }[]
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
