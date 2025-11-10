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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      behavior_templates: {
        Row: {
          business_type: string
          config: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          business_type: string
          config: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          business_type?: string
          config?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      card_analysis_history: {
        Row: {
          analyzed_at: string | null
          card_id: string
          conversation_length: number | null
          conversation_status: string | null
          conversation_summary: string | null
          created_at: string | null
          custom_fields_snapshot: Json | null
          funnel_score: number | null
          funnel_type: string | null
          id: string
          lead_data_snapshot: Json | null
          lifecycle_progress_percent: number | null
          lifecycle_stage_at_analysis: string | null
          loss_reason: string | null
          model_used: string | null
          product_item: string | null
          service_quality_score: number | null
          service_quality_suggestions: Json | null
          subject: string | null
          trigger_source: string | null
          value: number | null
          win_confirmation: string | null
        }
        Insert: {
          analyzed_at?: string | null
          card_id: string
          conversation_length?: number | null
          conversation_status?: string | null
          conversation_summary?: string | null
          created_at?: string | null
          custom_fields_snapshot?: Json | null
          funnel_score?: number | null
          funnel_type?: string | null
          id?: string
          lead_data_snapshot?: Json | null
          lifecycle_progress_percent?: number | null
          lifecycle_stage_at_analysis?: string | null
          loss_reason?: string | null
          model_used?: string | null
          product_item?: string | null
          service_quality_score?: number | null
          service_quality_suggestions?: Json | null
          subject?: string | null
          trigger_source?: string | null
          value?: number | null
          win_confirmation?: string | null
        }
        Update: {
          analyzed_at?: string | null
          card_id?: string
          conversation_length?: number | null
          conversation_status?: string | null
          conversation_summary?: string | null
          created_at?: string | null
          custom_fields_snapshot?: Json | null
          funnel_score?: number | null
          funnel_type?: string | null
          id?: string
          lead_data_snapshot?: Json | null
          lifecycle_progress_percent?: number | null
          lifecycle_stage_at_analysis?: string | null
          loss_reason?: string | null
          model_used?: string | null
          product_item?: string | null
          service_quality_score?: number | null
          service_quality_suggestions?: Json | null
          subject?: string | null
          trigger_source?: string | null
          value?: number | null
          win_confirmation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "card_analysis_history_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          ai_suggested: boolean | null
          ai_suggestions: Json | null
          assignee: string | null
          chatwoot_agent_name: string | null
          chatwoot_contact_email: string | null
          chatwoot_contact_name: string | null
          chatwoot_conversation_id: string | null
          column_id: string
          completed_at: string | null
          completed_by: string | null
          completion_reason: string | null
          completion_type: string | null
          conversation_status: string | null
          conversation_summary: string | null
          created_at: string | null
          current_lifecycle_stage: string | null
          custom_fields_data: Json | null
          customer_profile_id: string | null
          description: string | null
          funnel_score: number | null
          funnel_type: string | null
          id: string
          inbox_name: string | null
          is_monetary_locked: boolean | null
          last_activity_at: string | null
          lifecycle_progress_percent: number | null
          loss_reason: string | null
          position: number
          priority: string | null
          product_item: string | null
          resolution_status: string | null
          service_quality_score: number | null
          subject: string | null
          title: string
          updated_at: string | null
          value: number | null
          win_confirmation: string | null
        }
        Insert: {
          ai_suggested?: boolean | null
          ai_suggestions?: Json | null
          assignee?: string | null
          chatwoot_agent_name?: string | null
          chatwoot_contact_email?: string | null
          chatwoot_contact_name?: string | null
          chatwoot_conversation_id?: string | null
          column_id: string
          completed_at?: string | null
          completed_by?: string | null
          completion_reason?: string | null
          completion_type?: string | null
          conversation_status?: string | null
          conversation_summary?: string | null
          created_at?: string | null
          current_lifecycle_stage?: string | null
          custom_fields_data?: Json | null
          customer_profile_id?: string | null
          description?: string | null
          funnel_score?: number | null
          funnel_type?: string | null
          id?: string
          inbox_name?: string | null
          is_monetary_locked?: boolean | null
          last_activity_at?: string | null
          lifecycle_progress_percent?: number | null
          loss_reason?: string | null
          position?: number
          priority?: string | null
          product_item?: string | null
          resolution_status?: string | null
          service_quality_score?: number | null
          subject?: string | null
          title: string
          updated_at?: string | null
          value?: number | null
          win_confirmation?: string | null
        }
        Update: {
          ai_suggested?: boolean | null
          ai_suggestions?: Json | null
          assignee?: string | null
          chatwoot_agent_name?: string | null
          chatwoot_contact_email?: string | null
          chatwoot_contact_name?: string | null
          chatwoot_conversation_id?: string | null
          column_id?: string
          completed_at?: string | null
          completed_by?: string | null
          completion_reason?: string | null
          completion_type?: string | null
          conversation_status?: string | null
          conversation_summary?: string | null
          created_at?: string | null
          current_lifecycle_stage?: string | null
          custom_fields_data?: Json | null
          customer_profile_id?: string | null
          description?: string | null
          funnel_score?: number | null
          funnel_type?: string | null
          id?: string
          inbox_name?: string | null
          is_monetary_locked?: boolean | null
          last_activity_at?: string | null
          lifecycle_progress_percent?: number | null
          loss_reason?: string | null
          position?: number
          priority?: string | null
          product_item?: string | null
          resolution_status?: string | null
          service_quality_score?: number | null
          subject?: string | null
          title?: string
          updated_at?: string | null
          value?: number | null
          win_confirmation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "columns"
            referencedColumns: ["id"]
          },
        ]
      }
      chatwoot_integrations: {
        Row: {
          account_id: string
          active: boolean | null
          chatwoot_api_key: string
          chatwoot_url: string
          created_at: string | null
          id: string
          inbox_id: string | null
          pipeline_id: string
          updated_at: string | null
        }
        Insert: {
          account_id: string
          active?: boolean | null
          chatwoot_api_key: string
          chatwoot_url: string
          created_at?: string | null
          id?: string
          inbox_id?: string | null
          pipeline_id: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          active?: boolean | null
          chatwoot_api_key?: string
          chatwoot_url?: string
          created_at?: string | null
          id?: string
          inbox_id?: string | null
          pipeline_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatwoot_integrations_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: true
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      columns: {
        Row: {
          created_at: string | null
          id: string
          name: string
          pipeline_id: string
          position: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          pipeline_id: string
          position?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          pipeline_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "columns_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_profiles: {
        Row: {
          created_at: string | null
          customer_identifier: string
          email: string | null
          first_contact_at: string | null
          full_name: string | null
          id: string
          last_contact_at: string | null
          phone: string | null
          total_completed: number | null
          total_interactions: number | null
          total_lost: number | null
          total_value: number | null
          total_won: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_identifier: string
          email?: string | null
          first_contact_at?: string | null
          full_name?: string | null
          id?: string
          last_contact_at?: string | null
          phone?: string | null
          total_completed?: number | null
          total_interactions?: number | null
          total_lost?: number | null
          total_value?: number | null
          total_won?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_identifier?: string
          email?: string | null
          first_contact_at?: string | null
          full_name?: string | null
          id?: string
          last_contact_at?: string | null
          phone?: string | null
          total_completed?: number | null
          total_interactions?: number | null
          total_lost?: number | null
          total_value?: number | null
          total_won?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      funnel_config: {
        Row: {
          can_change_from_monetary: boolean | null
          color: string | null
          created_at: string | null
          funnel_name: string
          funnel_type: string
          id: string
          inactivity_days: number | null
          is_monetary: boolean | null
          lifecycle_stages: Json | null
          pipeline_id: string
          position: number | null
          priority: number | null
        }
        Insert: {
          can_change_from_monetary?: boolean | null
          color?: string | null
          created_at?: string | null
          funnel_name: string
          funnel_type: string
          id?: string
          inactivity_days?: number | null
          is_monetary?: boolean | null
          lifecycle_stages?: Json | null
          pipeline_id: string
          position?: number | null
          priority?: number | null
        }
        Update: {
          can_change_from_monetary?: boolean | null
          color?: string | null
          created_at?: string | null
          funnel_name?: string
          funnel_type?: string
          id?: string
          inactivity_days?: number | null
          is_monetary?: boolean | null
          lifecycle_stages?: Json | null
          pipeline_id?: string
          position?: number | null
          priority?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "intention_config_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_data: {
        Row: {
          address: string | null
          birthday: string | null
          card_id: string
          cpf: string | null
          created_at: string | null
          custom_fields: Json | null
          email: string | null
          full_name: string | null
          gender: string | null
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          birthday?: string | null
          card_id: string
          cpf?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          birthday?: string | null
          card_id?: string
          cpf?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_data_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: true
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_ai_config: {
        Row: {
          analyze_on_close: boolean | null
          analyze_on_message: boolean | null
          business_type: string | null
          created_at: string
          custom_prompt: string | null
          examples: Json | null
          generated_prompt: string
          id: string
          last_analyzed_at: string | null
          model_name: string | null
          move_rules: Json | null
          objectives: string[] | null
          pipeline_id: string
          success_rate: number | null
          template_id: string | null
          total_analyses: number | null
          updated_at: string
          use_custom_prompt: boolean | null
        }
        Insert: {
          analyze_on_close?: boolean | null
          analyze_on_message?: boolean | null
          business_type?: string | null
          created_at?: string
          custom_prompt?: string | null
          examples?: Json | null
          generated_prompt?: string
          id?: string
          last_analyzed_at?: string | null
          model_name?: string | null
          move_rules?: Json | null
          objectives?: string[] | null
          pipeline_id: string
          success_rate?: number | null
          template_id?: string | null
          total_analyses?: number | null
          updated_at?: string
          use_custom_prompt?: boolean | null
        }
        Update: {
          analyze_on_close?: boolean | null
          analyze_on_message?: boolean | null
          business_type?: string | null
          created_at?: string
          custom_prompt?: string | null
          examples?: Json | null
          generated_prompt?: string
          id?: string
          last_analyzed_at?: string | null
          model_name?: string | null
          move_rules?: Json | null
          objectives?: string[] | null
          pipeline_id?: string
          success_rate?: number | null
          template_id?: string | null
          total_analyses?: number | null
          updated_at?: string
          use_custom_prompt?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_ai_config_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: true
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_behaviors: {
        Row: {
          behavior_template_id: string | null
          created_at: string | null
          id: string
          is_customized: boolean | null
          pipeline_id: string | null
          updated_at: string | null
        }
        Insert: {
          behavior_template_id?: string | null
          created_at?: string | null
          id?: string
          is_customized?: boolean | null
          pipeline_id?: string | null
          updated_at?: string | null
        }
        Update: {
          behavior_template_id?: string | null
          created_at?: string | null
          id?: string
          is_customized?: boolean | null
          pipeline_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_behaviors_behavior_template_id_fkey"
            columns: ["behavior_template_id"]
            isOneToOne: false
            referencedRelation: "behavior_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_behaviors_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: true
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_custom_fields: {
        Row: {
          created_at: string | null
          field_label: string
          field_name: string
          field_options: Json | null
          field_type: Database["public"]["Enums"]["custom_field_type"]
          id: string
          is_required: boolean | null
          pipeline_id: string
          position: number | null
        }
        Insert: {
          created_at?: string | null
          field_label: string
          field_name: string
          field_options?: Json | null
          field_type?: Database["public"]["Enums"]["custom_field_type"]
          id?: string
          is_required?: boolean | null
          pipeline_id: string
          position?: number | null
        }
        Update: {
          created_at?: string | null
          field_label?: string
          field_name?: string
          field_options?: Json | null
          field_type?: Database["public"]["Enums"]["custom_field_type"]
          id?: string
          is_required?: boolean | null
          pipeline_id?: string
          position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_custom_fields_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_inactivity_config: {
        Row: {
          created_at: string | null
          funnel_type: string
          id: string
          inactivity_days: number
          move_to_column_name: string | null
          only_if_non_monetary: boolean | null
          only_if_progress_below: number | null
          pipeline_id: string
          set_resolution_status: string | null
        }
        Insert: {
          created_at?: string | null
          funnel_type: string
          id?: string
          inactivity_days?: number
          move_to_column_name?: string | null
          only_if_non_monetary?: boolean | null
          only_if_progress_below?: number | null
          pipeline_id: string
          set_resolution_status?: string | null
        }
        Update: {
          created_at?: string | null
          funnel_type?: string
          id?: string
          inactivity_days?: number
          move_to_column_name?: string | null
          only_if_non_monetary?: boolean | null
          only_if_progress_below?: number | null
          pipeline_id?: string
          set_resolution_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_inactivity_config_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_movement_rules: {
        Row: {
          created_at: string | null
          funnel_type: string
          id: string
          is_active: boolean | null
          move_to_column_name: string
          pipeline_id: string
          priority: number | null
          when_conversation_status: string | null
          when_inactivity_days: number | null
          when_lifecycle_stage: string | null
        }
        Insert: {
          created_at?: string | null
          funnel_type: string
          id?: string
          is_active?: boolean | null
          move_to_column_name: string
          pipeline_id: string
          priority?: number | null
          when_conversation_status?: string | null
          when_inactivity_days?: number | null
          when_lifecycle_stage?: string | null
        }
        Update: {
          created_at?: string | null
          funnel_type?: string
          id?: string
          is_active?: boolean | null
          move_to_column_name?: string
          pipeline_id?: string
          priority?: number | null
          when_conversation_status?: string | null
          when_inactivity_days?: number | null
          when_lifecycle_stage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_movement_rules_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_sla_config: {
        Row: {
          created_at: string | null
          first_response_minutes: number | null
          id: string
          ongoing_response_minutes: number | null
          pipeline_id: string
          updated_at: string | null
          warning_threshold_percent: number | null
        }
        Insert: {
          created_at?: string | null
          first_response_minutes?: number | null
          id?: string
          ongoing_response_minutes?: number | null
          pipeline_id: string
          updated_at?: string | null
          warning_threshold_percent?: number | null
        }
        Update: {
          created_at?: string | null
          first_response_minutes?: number | null
          id?: string
          ongoing_response_minutes?: number | null
          pipeline_id?: string
          updated_at?: string | null
          warning_threshold_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_sla_config_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: true
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          created_at: string | null
          id: string
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_workspace"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workspace_invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          id: string
          joined_at: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_cards_bulk: { Args: { card_ids: string[] }; Returns: undefined }
      generate_customer_identifier: {
        Args: { p_chatwoot_id: string; p_email: string; p_phone: string }
        Returns: string
      }
      get_user_workspace_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_customer_stat: {
        Args: { profile_id: string; stat_field: string }
        Returns: undefined
      }
      update_cards_column_bulk: {
        Args: { card_ids: string[]; new_column_id: string }
        Returns: undefined
      }
      user_is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      custom_field_type:
        | "text"
        | "number"
        | "date"
        | "email"
        | "phone"
        | "select"
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
    Enums: {
      app_role: ["admin", "user"],
      custom_field_type: ["text", "number", "date", "email", "phone", "select"],
    },
  },
} as const
