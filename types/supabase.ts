export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          lead_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          lead_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_attachments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_vendors: {
        Row: {
          created_at: string
          email_sent: boolean
          email_sent_at: string | null
          id: string
          lead_id: string
          notes: string | null
          vendor_id: string
          whatsapp_prepared: boolean
          whatsapp_prepared_at: string | null
        }
        Insert: {
          created_at?: string
          email_sent?: boolean
          email_sent_at?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          vendor_id: string
          whatsapp_prepared?: boolean
          whatsapp_prepared_at?: string | null
        }
        Update: {
          created_at?: string
          email_sent?: boolean
          email_sent_at?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          vendor_id?: string
          whatsapp_prepared?: boolean
          whatsapp_prepared_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_vendors_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_vendors_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          delivery_terms: string | null
          due_date: string | null
          gst_rate: number | null
          id: string
          lead_name: string
          lead_number: string
          product_item: string
          quantity: number
          remarks: string | null
          specifications: string | null
          status: string
          unit_price_estimate: number | null
          updated_at: string
          warranty: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_name: string
          delivery_terms?: string | null
          due_date?: string | null
          gst_rate?: number | null
          id?: string
          lead_name: string
          lead_number: string
          product_item: string
          quantity?: number
          remarks?: string | null
          specifications?: string | null
          status?: string
          unit_price_estimate?: number | null
          updated_at?: string
          warranty?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string
          delivery_terms?: string | null
          due_date?: string | null
          gst_rate?: number | null
          id?: string
          lead_name?: string
          lead_number?: string
          product_item?: string
          quantity?: number
          remarks?: string | null
          specifications?: string | null
          status?: string
          unit_price_estimate?: number | null
          updated_at?: string
          warranty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      message_logs: {
        Row: {
          channel: string
          content: string
          created_at: string
          error_message: string | null
          id: string
          lead_id: string | null
          recipient: string
          status: string
          subject: string | null
          vendor_id: string | null
        }
        Insert: {
          channel: string
          content: string
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          recipient: string
          status?: string
          subject?: string | null
          vendor_id?: string | null
        }
        Update: {
          channel?: string
          content?: string
          created_at?: string
          error_message?: string | null
          id?: string
          lead_id?: string | null
          recipient?: string
          status?: string
          subject?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      vendor_categories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          vendor_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          vendor_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_categories_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          key: string
          value: Json
          updated_at: string
        }
        Insert: {
          key: string
          value: Json
          updated_at?: string
        }
        Update: {
          key?: string
          value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      vendor_registrations: {
        Row: {
          address: string | null
          category_ids: string[] | null
          company_name: string
          contact_person: string
          created_at: string
          email: string
          gst_number: string | null
          id: string
          notes: string | null
          rejection_reason: string | null
          status: string
          updated_at: string
          vendor_id: string | null
          whatsapp_number: string
        }
        Insert: {
          address?: string | null
          category_ids?: string[] | null
          company_name: string
          contact_person: string
          created_at?: string
          email: string
          gst_number?: string | null
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string | null
          whatsapp_number: string
        }
        Update: {
          address?: string | null
          category_ids?: string[] | null
          company_name?: string
          contact_person?: string
          created_at?: string
          email?: string
          gst_number?: string | null
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string | null
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_registrations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          company_name: string
          contact_person: string
          created_at: string
          email: string
          gst_number: string | null
          id: string
          notes: string | null
          registration_status: string
          status: string
          updated_at: string
          whatsapp_number: string
        }
        Insert: {
          address?: string | null
          company_name: string
          contact_person: string
          created_at?: string
          email: string
          gst_number?: string | null
          id?: string
          notes?: string | null
          registration_status?: string
          status?: string
          updated_at?: string
          whatsapp_number: string
        }
        Update: {
          address?: string | null
          company_name?: string
          contact_person?: string
          created_at?: string
          email?: string
          gst_number?: string | null
          id?: string
          notes?: string | null
          registration_status?: string
          status?: string
          updated_at?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

