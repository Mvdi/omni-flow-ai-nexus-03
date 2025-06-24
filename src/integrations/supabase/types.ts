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
      customers: {
        Row: {
          adresse: string | null
          by: string | null
          created_at: string
          cvr: string | null
          email: string
          id: string
          kundetype: string | null
          navn: string | null
          noter: string | null
          postnummer: string | null
          score: number | null
          telefon: string | null
          updated_at: string
          virksomhedsnavn: string | null
        }
        Insert: {
          adresse?: string | null
          by?: string | null
          created_at?: string
          cvr?: string | null
          email: string
          id?: string
          kundetype?: string | null
          navn?: string | null
          noter?: string | null
          postnummer?: string | null
          score?: number | null
          telefon?: string | null
          updated_at?: string
          virksomhedsnavn?: string | null
        }
        Update: {
          adresse?: string | null
          by?: string | null
          created_at?: string
          cvr?: string | null
          email?: string
          id?: string
          kundetype?: string | null
          navn?: string | null
          noter?: string | null
          postnummer?: string | null
          score?: number | null
          telefon?: string | null
          updated_at?: string
          virksomhedsnavn?: string | null
        }
        Relationships: []
      }
      integration_secrets: {
        Row: {
          created_at: string | null
          id: string
          key_name: string
          key_value: string
          provider: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key_name: string
          key_value: string
          provider: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key_name?: string
          key_value?: string
          provider?: string
        }
        Relationships: []
      }
      kanban_columns: {
        Row: {
          color: string
          column_id: string
          created_at: string | null
          id: number
          is_active: boolean | null
          sort_order: number
          title: string
          updated_at: string | null
        }
        Insert: {
          color: string
          column_id: string
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          sort_order: number
          title: string
          updated_at?: string | null
        }
        Update: {
          color?: string
          column_id?: string
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          sort_order?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          adresse: string | null
          ai_enriched_data: Json | null
          ai_enrichment_notes: string[] | null
          ai_last_enriched_at: string | null
          ai_last_scored_at: string | null
          ai_score: number | null
          ai_score_factors: string[] | null
          by: string | null
          created_at: string
          email: string
          id: string
          navn: string
          noter: string | null
          postnummer: string | null
          prioritet: string | null
          sidste_kontakt: string | null
          status: string | null
          telefon: string | null
          updated_at: string
          uploads: Json | null
          vaerdi: number | null
          virksomhed: string | null
        }
        Insert: {
          adresse?: string | null
          ai_enriched_data?: Json | null
          ai_enrichment_notes?: string[] | null
          ai_last_enriched_at?: string | null
          ai_last_scored_at?: string | null
          ai_score?: number | null
          ai_score_factors?: string[] | null
          by?: string | null
          created_at?: string
          email: string
          id?: string
          navn: string
          noter?: string | null
          postnummer?: string | null
          prioritet?: string | null
          sidste_kontakt?: string | null
          status?: string | null
          telefon?: string | null
          updated_at?: string
          uploads?: Json | null
          vaerdi?: number | null
          virksomhed?: string | null
        }
        Update: {
          adresse?: string | null
          ai_enriched_data?: Json | null
          ai_enrichment_notes?: string[] | null
          ai_last_enriched_at?: string | null
          ai_last_scored_at?: string | null
          ai_score?: number | null
          ai_score_factors?: string[] | null
          by?: string | null
          created_at?: string
          email?: string
          id?: string
          navn?: string
          noter?: string | null
          postnummer?: string | null
          prioritet?: string | null
          sidste_kontakt?: string | null
          status?: string | null
          telefon?: string | null
          updated_at?: string
          uploads?: Json | null
          vaerdi?: number | null
          virksomhed?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assignee_id: string | null
          content: string | null
          created_at: string
          customer_email: string
          customer_name: string | null
          id: string
          last_response_at: string | null
          priority: string
          response_time_hours: number | null
          status: string
          subject: string
          ticket_number: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          content?: string | null
          created_at?: string
          customer_email: string
          customer_name?: string | null
          id?: string
          last_response_at?: string | null
          priority?: string
          response_time_hours?: number | null
          status?: string
          subject: string
          ticket_number: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          content?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string | null
          id?: string
          last_response_at?: string | null
          priority?: string
          response_time_hours?: number | null
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          attachments: Json | null
          created_at: string
          id: string
          is_ai_generated: boolean | null
          is_internal: boolean | null
          message_content: string
          sender_email: string
          sender_name: string | null
          ticket_id: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_ai_generated?: boolean | null
          is_internal?: boolean | null
          message_content: string
          sender_email: string
          sender_name?: string | null
          ticket_id?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_ai_generated?: boolean | null
          is_internal?: boolean | null
          message_content?: string
          sender_email?: string
          sender_name?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_tags: {
        Row: {
          created_at: string
          id: string
          tag_name: string
          ticket_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          tag_name: string
          ticket_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          tag_name?: string
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_tags_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_signatures: {
        Row: {
          created_at: string | null
          extra_text: string | null
          font_family: string | null
          html: string
          id: string
          plain: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          extra_text?: string | null
          font_family?: string | null
          html: string
          id?: string
          plain?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          extra_text?: string | null
          font_family?: string | null
          html?: string
          id?: string
          plain?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          image: string | null
          name: string | null
          token_identifier: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          image?: string | null
          name?: string | null
          token_identifier: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          image?: string | null
          name?: string | null
          token_identifier?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      avg_response_time_for_customer: {
        Args: { customer_email_input: string }
        Returns: {
          avg: number
        }[]
      }
      calculate_customer_score: {
        Args: { customer_email_param: string }
        Returns: number
      }
      generate_ticket_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      update_customer_type: {
        Args: { customer_email_param: string }
        Returns: string
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
