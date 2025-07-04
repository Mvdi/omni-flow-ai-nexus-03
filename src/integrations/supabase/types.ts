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
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      authorized_emails: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string
          id: string
          is_active: boolean | null
          notes: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
        }
        Relationships: []
      }
      blocked_time_slots: {
        Row: {
          blocked_date: string
          created_at: string
          employee_id: string | null
          end_time: string
          id: string
          reason: string | null
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          blocked_date: string
          created_at?: string
          employee_id?: string | null
          end_time: string
          id?: string
          reason?: string | null
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          blocked_date?: string
          created_at?: string
          employee_id?: string | null
          end_time?: string
          id?: string
          reason?: string | null
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_time_slots_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          adresse: string | null
          by: string | null
          created_at: string | null
          cvr: string | null
          email: string
          id: string
          kundetype: string | null
          navn: string | null
          noter: string | null
          postnummer: string | null
          score: number | null
          telefon: string | null
          updated_at: string | null
          virksomhedsnavn: string | null
        }
        Insert: {
          adresse?: string | null
          by?: string | null
          created_at?: string | null
          cvr?: string | null
          email: string
          id?: string
          kundetype?: string | null
          navn?: string | null
          noter?: string | null
          postnummer?: string | null
          score?: number | null
          telefon?: string | null
          updated_at?: string | null
          virksomhedsnavn?: string | null
        }
        Update: {
          adresse?: string | null
          by?: string | null
          created_at?: string | null
          cvr?: string | null
          email?: string
          id?: string
          kundetype?: string | null
          navn?: string | null
          noter?: string | null
          postnummer?: string | null
          score?: number | null
          telefon?: string | null
          updated_at?: string | null
          virksomhedsnavn?: string | null
        }
        Relationships: []
      }
      email_sync_log: {
        Row: {
          emails_processed: number | null
          error_details: string | null
          errors_count: number | null
          facebook_leads_created: number | null
          id: string
          leads_vs_tickets_ratio: number | null
          mailbox_address: string
          status: string | null
          sync_completed_at: string | null
          sync_started_at: string | null
        }
        Insert: {
          emails_processed?: number | null
          error_details?: string | null
          errors_count?: number | null
          facebook_leads_created?: number | null
          id?: string
          leads_vs_tickets_ratio?: number | null
          mailbox_address: string
          status?: string | null
          sync_completed_at?: string | null
          sync_started_at?: string | null
        }
        Update: {
          emails_processed?: number | null
          error_details?: string | null
          errors_count?: number | null
          facebook_leads_created?: number | null
          id?: string
          leads_vs_tickets_ratio?: number | null
          mailbox_address?: string
          status?: string | null
          sync_completed_at?: string | null
          sync_started_at?: string | null
        }
        Relationships: []
      }
      employee_customer_assignments: {
        Row: {
          assignment_date: string | null
          created_at: string
          customer_email: string
          customer_name: string | null
          employee_id: string
          id: string
          is_primary: boolean | null
          notes: string | null
          user_id: string
        }
        Insert: {
          assignment_date?: string | null
          created_at?: string
          customer_email: string
          customer_name?: string | null
          employee_id: string
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          user_id: string
        }
        Update: {
          assignment_date?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string | null
          employee_id?: string
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_customer_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          bfe_number: string | null
          created_at: string
          email: string
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          max_hours_per_day: number | null
          name: string
          phone: string | null
          preferred_areas: string[] | null
          specialties: string[] | null
          start_location: string | null
          updated_at: string
          user_id: string
          work_radius_km: number | null
        }
        Insert: {
          bfe_number?: string | null
          created_at?: string
          email: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_hours_per_day?: number | null
          name: string
          phone?: string | null
          preferred_areas?: string[] | null
          specialties?: string[] | null
          start_location?: string | null
          updated_at?: string
          user_id: string
          work_radius_km?: number | null
        }
        Update: {
          bfe_number?: string | null
          created_at?: string
          email?: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          max_hours_per_day?: number | null
          name?: string
          phone?: string | null
          preferred_areas?: string[] | null
          specialties?: string[] | null
          start_location?: string | null
          updated_at?: string
          user_id?: string
          work_radius_km?: number | null
        }
        Relationships: []
      }
      enhanced_rate_limits: {
        Row: {
          action_type: string
          created_at: string | null
          endpoint: string
          id: string
          identifier: string
          metadata: Json | null
          request_count: number | null
          window_start: string | null
        }
        Insert: {
          action_type?: string
          created_at?: string | null
          endpoint: string
          id?: string
          identifier: string
          metadata?: Json | null
          request_count?: number | null
          window_start?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          identifier?: string
          metadata?: Json | null
          request_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      facebook_leads_processed: {
        Row: {
          customer_data: Json | null
          email_message_id: string
          id: string
          lead_id: string | null
          original_email_content: string | null
          processed_at: string | null
          processing_notes: string | null
          service_detected: string | null
        }
        Insert: {
          customer_data?: Json | null
          email_message_id: string
          id?: string
          lead_id?: string | null
          original_email_content?: string | null
          processed_at?: string | null
          processing_notes?: string | null
          service_detected?: string | null
        }
        Update: {
          customer_data?: Json | null
          email_message_id?: string
          id?: string
          lead_id?: string | null
          original_email_content?: string | null
          processed_at?: string | null
          processing_notes?: string | null
          service_detected?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facebook_leads_processed_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
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
          created_at: string | null
          email: string
          id: string
          kilde: string | null
          navn: string
          noter: string | null
          postnummer: string | null
          prioritet: string | null
          services: string | null
          sidste_kontakt: string | null
          status: string | null
          telefon: string | null
          updated_at: string | null
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
          created_at?: string | null
          email: string
          id?: string
          kilde?: string | null
          navn: string
          noter?: string | null
          postnummer?: string | null
          prioritet?: string | null
          services?: string | null
          sidste_kontakt?: string | null
          status?: string | null
          telefon?: string | null
          updated_at?: string | null
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
          created_at?: string | null
          email?: string
          id?: string
          kilde?: string | null
          navn?: string
          noter?: string | null
          postnummer?: string | null
          prioritet?: string | null
          services?: string | null
          sidste_kontakt?: string | null
          status?: string | null
          telefon?: string | null
          updated_at?: string | null
          uploads?: Json | null
          vaerdi?: number | null
          virksomhed?: string | null
        }
        Relationships: []
      }
      monitored_mailboxes: {
        Row: {
          created_at: string | null
          email_address: string
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          sync_token: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email_address: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          sync_token?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email_address?: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          sync_token?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      optimization_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_details: string | null
          fuel_savings_estimate: number | null
          id: string
          optimization_config: Json | null
          orders_optimized: number | null
          run_type: string
          started_at: string
          status: string
          total_distance_km: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_details?: string | null
          fuel_savings_estimate?: number | null
          id?: string
          optimization_config?: Json | null
          orders_optimized?: number | null
          run_type?: string
          started_at?: string
          status?: string
          total_distance_km?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_details?: string | null
          fuel_savings_estimate?: number | null
          id?: string
          optimization_config?: Json | null
          orders_optimized?: number | null
          run_type?: string
          started_at?: string
          status?: string
          total_distance_km?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          address: string | null
          ai_suggested_time: string | null
          assigned_employee_id: string | null
          bfe_number: string | null
          comment: string | null
          created_at: string
          customer: string
          customer_email: string | null
          distance_from_previous_km: number | null
          edited_manually: boolean | null
          estimated_duration: number | null
          expected_completion_time: string | null
          fuel_cost_estimate: number | null
          geocoded_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          optimization_run_id: string | null
          order_sequence: number | null
          order_type: string
          price: number
          priority: string
          route_id: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          scheduled_week: number | null
          status: string
          subscription_id: string | null
          travel_time_minutes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          ai_suggested_time?: string | null
          assigned_employee_id?: string | null
          bfe_number?: string | null
          comment?: string | null
          created_at?: string
          customer: string
          customer_email?: string | null
          distance_from_previous_km?: number | null
          edited_manually?: boolean | null
          estimated_duration?: number | null
          expected_completion_time?: string | null
          fuel_cost_estimate?: number | null
          geocoded_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          optimization_run_id?: string | null
          order_sequence?: number | null
          order_type: string
          price?: number
          priority?: string
          route_id?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          scheduled_week?: number | null
          status?: string
          subscription_id?: string | null
          travel_time_minutes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          ai_suggested_time?: string | null
          assigned_employee_id?: string | null
          bfe_number?: string | null
          comment?: string | null
          created_at?: string
          customer?: string
          customer_email?: string | null
          distance_from_previous_km?: number | null
          edited_manually?: boolean | null
          estimated_duration?: number | null
          expected_completion_time?: string | null
          fuel_cost_estimate?: number | null
          geocoded_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          optimization_run_id?: string | null
          order_sequence?: number | null
          order_type?: string
          price?: number
          priority?: string
          route_id?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          scheduled_week?: number | null
          status?: string
          subscription_id?: string | null
          travel_time_minutes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          navn: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          navn?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          navn?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quote_email_templates: {
        Row: {
          created_at: string
          description: string | null
          html_template: string | null
          id: string
          is_default: boolean
          name: string
          template_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          html_template?: string | null
          id?: string
          is_default?: boolean
          name: string
          template_data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          html_template?: string | null
          id?: string
          is_default?: boolean
          name?: string
          template_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quote_products: {
        Row: {
          category: string | null
          created_at: string
          default_price: number | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          default_price?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          default_price?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quote_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          template_text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          template_text?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          template_text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          created_at: string
          currency: string | null
          customer_email: string
          customer_name: string | null
          description: string | null
          id: string
          items: Json | null
          lead_id: string | null
          notes: string | null
          quote_number: string
          status: string | null
          template_used: string | null
          title: string
          total_amount: number
          updated_at: string
          user_id: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          currency?: string | null
          customer_email: string
          customer_name?: string | null
          description?: string | null
          id?: string
          items?: Json | null
          lead_id?: string | null
          notes?: string | null
          quote_number: string
          status?: string | null
          template_used?: string | null
          title: string
          total_amount?: number
          updated_at?: string
          user_id: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          currency?: string | null
          customer_email?: string
          customer_name?: string | null
          description?: string | null
          id?: string
          items?: Json | null
          lead_id?: string | null
          notes?: string | null
          quote_number?: string
          status?: string | null
          template_used?: string | null
          title?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          identifier: string
          request_count: number | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          identifier: string
          request_count?: number | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      routes: {
        Row: {
          actual_distance_km: number | null
          actual_duration_hours: number | null
          ai_optimized: boolean | null
          capacity_constraints: Json | null
          created_at: string
          distance_matrix: Json | null
          employee_id: string
          estimated_distance_km: number | null
          estimated_duration_hours: number | null
          fuel_cost_estimate: number | null
          id: string
          mapbox_route_data: Json | null
          name: string
          optimization_method: string | null
          optimization_score: number | null
          or_tools_solution: Json | null
          route_date: string
          start_location: string | null
          status: string | null
          total_revenue: number | null
          total_travel_time_minutes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_distance_km?: number | null
          actual_duration_hours?: number | null
          ai_optimized?: boolean | null
          capacity_constraints?: Json | null
          created_at?: string
          distance_matrix?: Json | null
          employee_id: string
          estimated_distance_km?: number | null
          estimated_duration_hours?: number | null
          fuel_cost_estimate?: number | null
          id?: string
          mapbox_route_data?: Json | null
          name: string
          optimization_method?: string | null
          optimization_score?: number | null
          or_tools_solution?: Json | null
          route_date: string
          start_location?: string | null
          status?: string | null
          total_revenue?: number | null
          total_travel_time_minutes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_distance_km?: number | null
          actual_duration_hours?: number | null
          ai_optimized?: boolean | null
          capacity_constraints?: Json | null
          created_at?: string
          distance_matrix?: Json | null
          employee_id?: string
          estimated_distance_km?: number | null
          estimated_duration_hours?: number | null
          fuel_cost_estimate?: number | null
          id?: string
          mapbox_route_data?: Json | null
          name?: string
          optimization_method?: string | null
          optimization_score?: number | null
          or_tools_solution?: Json | null
          route_date?: string
          start_location?: string | null
          status?: string | null
          total_revenue?: number | null
          total_travel_time_minutes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          source: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          source?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          source?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      service_detection_patterns: {
        Row: {
          created_at: string | null
          detection_patterns: string[]
          id: string
          priority: number | null
          service_name: string
        }
        Insert: {
          created_at?: string | null
          detection_patterns: string[]
          id?: string
          priority?: number | null
          service_name: string
        }
        Update: {
          created_at?: string | null
          detection_patterns?: string[]
          id?: string
          priority?: number | null
          service_name?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          auto_create_orders: boolean | null
          created_at: string
          customer_address: string | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          description: string | null
          estimated_duration: number
          id: string
          images: Json | null
          interval_weeks: number
          last_order_date: string | null
          next_due_date: string
          notes: string | null
          price: number
          send_notifications: boolean | null
          service_type: string
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_create_orders?: boolean | null
          created_at?: string
          customer_address?: string | null
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          description?: string | null
          estimated_duration: number
          id?: string
          images?: Json | null
          interval_weeks: number
          last_order_date?: string | null
          next_due_date: string
          notes?: string | null
          price: number
          send_notifications?: boolean | null
          service_type: string
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_create_orders?: boolean | null
          created_at?: string
          customer_address?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          description?: string | null
          estimated_duration?: number
          id?: string
          images?: Json | null
          interval_weeks?: number
          last_order_date?: string | null
          next_due_date?: string
          notes?: string | null
          price?: number
          send_notifications?: boolean | null
          service_type?: string
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assignee_id: string | null
          auto_assigned: boolean | null
          category: string | null
          content: string | null
          created_at: string | null
          customer_email: string
          customer_name: string | null
          customer_sentiment: string | null
          email_message_id: string | null
          email_received_at: string | null
          email_thread_id: string | null
          escalated: boolean | null
          id: string
          last_outgoing_message_id: string | null
          last_response_at: string | null
          mailbox_address: string | null
          original_message_id: string | null
          priority: string | null
          response_time_hours: number | null
          sla_deadline: string | null
          source: string | null
          status: string | null
          subject: string
          tags: string[] | null
          ticket_number: string
          updated_at: string | null
        }
        Insert: {
          assignee_id?: string | null
          auto_assigned?: boolean | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          customer_email: string
          customer_name?: string | null
          customer_sentiment?: string | null
          email_message_id?: string | null
          email_received_at?: string | null
          email_thread_id?: string | null
          escalated?: boolean | null
          id?: string
          last_outgoing_message_id?: string | null
          last_response_at?: string | null
          mailbox_address?: string | null
          original_message_id?: string | null
          priority?: string | null
          response_time_hours?: number | null
          sla_deadline?: string | null
          source?: string | null
          status?: string | null
          subject: string
          tags?: string[] | null
          ticket_number: string
          updated_at?: string | null
        }
        Update: {
          assignee_id?: string | null
          auto_assigned?: boolean | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          customer_email?: string
          customer_name?: string | null
          customer_sentiment?: string | null
          email_message_id?: string | null
          email_received_at?: string | null
          email_thread_id?: string | null
          escalated?: boolean | null
          id?: string
          last_outgoing_message_id?: string | null
          last_response_at?: string | null
          mailbox_address?: string | null
          original_message_id?: string | null
          priority?: string | null
          response_time_hours?: number | null
          sla_deadline?: string | null
          source?: string | null
          status?: string | null
          subject?: string
          tags?: string[] | null
          ticket_number?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          attachments: Json | null
          created_at: string | null
          email_message_id: string | null
          id: string
          in_reply_to_message_id: string | null
          is_ai_generated: boolean | null
          is_internal: boolean | null
          message_content: string
          message_type: string | null
          references_header: string | null
          sender_email: string
          sender_name: string | null
          ticket_id: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          email_message_id?: string | null
          id?: string
          in_reply_to_message_id?: string | null
          is_ai_generated?: boolean | null
          is_internal?: boolean | null
          message_content: string
          message_type?: string | null
          references_header?: string | null
          sender_email: string
          sender_name?: string | null
          ticket_id?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          email_message_id?: string | null
          id?: string
          in_reply_to_message_id?: string | null
          is_ai_generated?: boolean | null
          is_internal?: boolean | null
          message_content?: string
          message_type?: string | null
          references_header?: string | null
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
      ticket_reminders: {
        Row: {
          created_at: string
          id: string
          is_completed: boolean
          remind_at: string
          reminder_text: string
          ticket_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_completed?: boolean
          remind_at: string
          reminder_text: string
          ticket_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_completed?: boolean
          remind_at?: string
          reminder_text?: string
          ticket_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_reminders_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_tags: {
        Row: {
          created_at: string | null
          id: string
          tag_name: string
          ticket_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          tag_name: string
          ticket_id?: string | null
        }
        Update: {
          created_at?: string | null
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
      tilbud: {
        Row: {
          adresse: string
          beregnet_pris: string
          created_at: string | null
          email: string
          id: string
          interval: string
          navn: string
          telefon: string
          vedligeholdelse: boolean
        }
        Insert: {
          adresse: string
          beregnet_pris: string
          created_at?: string | null
          email: string
          id?: string
          interval: string
          navn: string
          telefon: string
          vedligeholdelse: boolean
        }
        Update: {
          adresse?: string
          beregnet_pris?: string
          created_at?: string | null
          email?: string
          id?: string
          interval?: string
          navn?: string
          telefon?: string
          vedligeholdelse?: boolean
        }
        Relationships: []
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
      work_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          employee_id: string | null
          end_time: string
          id: string
          is_working_day: boolean
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          employee_id?: string | null
          end_time?: string
          id?: string
          is_working_day?: boolean
          start_time?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          employee_id?: string | null
          end_time?: string
          id?: string
          is_working_day?: boolean
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
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
      calculate_next_due_date: {
        Args: {
          start_date: string
          interval_weeks: number
          last_order_date: string
        }
        Returns: string
      }
      check_rate_limit: {
        Args: {
          p_identifier: string
          p_endpoint: string
          p_max_requests?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      create_facebook_lead: {
        Args: {
          email_content: string
          sender_email: string
          sender_name?: string
        }
        Returns: string
      }
      create_subscription_orders: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      enhanced_rate_limit_check: {
        Args: {
          p_identifier: string
          p_endpoint: string
          p_action_type?: string
          p_max_requests?: number
          p_window_minutes?: number
        }
        Returns: Json
      }
      enhanced_validate_input: {
        Args: { input_data: Json; validation_rules?: Json }
        Returns: Json
      }
      generate_quote_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_ticket_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_email_sync_health_detailed: {
        Args: Record<PropertyKey, never>
        Returns: {
          status: string
          last_sync_at: string
          minutes_since_last_sync: number
          facebook_leads_today: number
          total_emails_today: number
          consecutive_failures: number
          health_score: number
        }[]
      }
      validate_form_input: {
        Args: { input_data: Json }
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
