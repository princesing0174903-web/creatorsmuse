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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      brand_settings: {
        Row: {
          accent_color: string | null
          banned_words: string[]
          brand_name: string | null
          created_at: string
          keywords: string[]
          links: Json
          logo_url: string | null
          metadata: Json
          niche: string | null
          primary_color: string | null
          target_audience: string | null
          tone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          banned_words?: string[]
          brand_name?: string | null
          created_at?: string
          keywords?: string[]
          links?: Json
          logo_url?: string | null
          metadata?: Json
          niche?: string | null
          primary_color?: string | null
          target_audience?: string | null
          tone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accent_color?: string | null
          banned_words?: string[]
          brand_name?: string | null
          created_at?: string
          keywords?: string[]
          links?: Json
          logo_url?: string | null
          metadata?: Json
          niche?: string | null
          primary_color?: string | null
          target_audience?: string | null
          tone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      generations: {
        Row: {
          created_at: string
          credits_used: number
          error: string | null
          id: string
          input: Json
          kind: string
          model: string | null
          output: Json
          parent_id: string | null
          project_id: string | null
          status: string
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_used?: number
          error?: string | null
          id?: string
          input?: Json
          kind: string
          model?: string | null
          output?: Json
          parent_id?: string | null
          project_id?: string | null
          status?: string
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_used?: number
          error?: string | null
          id?: string
          input?: Json
          kind?: string
          model?: string | null
          output?: Json
          parent_id?: string | null
          project_id?: string | null
          status?: string
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      library_assets: {
        Row: {
          archived: boolean
          asset_type: string
          content: string | null
          created_at: string
          favorite: boolean
          generation_id: string | null
          id: string
          media_url: string | null
          metadata: Json
          project_id: string | null
          scores: Json
          tags: string[]
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          asset_type: string
          content?: string | null
          created_at?: string
          favorite?: boolean
          generation_id?: string | null
          id?: string
          media_url?: string | null
          metadata?: Json
          project_id?: string | null
          scores?: Json
          tags?: string[]
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          asset_type?: string
          content?: string | null
          created_at?: string
          favorite?: boolean
          generation_id?: string | null
          id?: string
          media_url?: string | null
          metadata?: Json
          project_id?: string | null
          scores?: Json
          tags?: string[]
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_assets_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          archived: boolean
          category: string | null
          color: string
          created_at: string
          description: string | null
          estimated_completion: string | null
          favorite: boolean
          icon: string | null
          id: string
          metadata: Json
          name: string
          platform: string
          priority: string
          progress: number
          status: string
          tags: string[]
          thumbnail_url: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          category?: string | null
          color?: string
          created_at?: string
          description?: string | null
          estimated_completion?: string | null
          favorite?: boolean
          icon?: string | null
          id?: string
          metadata?: Json
          name: string
          platform?: string
          priority?: string
          progress?: number
          status?: string
          tags?: string[]
          thumbnail_url?: string | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          category?: string | null
          color?: string
          created_at?: string
          description?: string | null
          estimated_completion?: string | null
          favorite?: boolean
          icon?: string | null
          id?: string
          metadata?: Json
          name?: string
          platform?: string
          priority?: string
          progress?: number
          status?: string
          tags?: string[]
          thumbnail_url?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          month: string
          updated_at: string
          used: number
          user_id: string
        }
        Insert: {
          month: string
          updated_at?: string
          used?: number
          user_id: string
        }
        Update: {
          month?: string
          updated_at?: string
          used?: number
          user_id?: string
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          plan: string
          updated_at: string
          user_id: string
        }
        Insert: {
          plan?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          plan?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          default_project_id: string | null
          email_notifications: boolean
          marketing_emails: boolean
          onboarding_completed: boolean
          preferences: Json
          product_updates: boolean
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_project_id?: string | null
          email_notifications?: boolean
          marketing_emails?: boolean
          onboarding_completed?: boolean
          preferences?: Json
          product_updates?: boolean
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_project_id?: string | null
          email_notifications?: boolean
          marketing_emails?: boolean
          onboarding_completed?: boolean
          preferences?: Json
          product_updates?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_default_project_id_fkey"
            columns: ["default_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_cards: {
        Row: {
          created_at: string
          id: string
          linked_asset_id: string | null
          linked_generation_id: string | null
          metadata: Json
          notes: string | null
          position: number
          stage: string
          title: string
          updated_at: string
          user_id: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          linked_asset_id?: string | null
          linked_generation_id?: string | null
          metadata?: Json
          notes?: string | null
          position?: number
          stage?: string
          title: string
          updated_at?: string
          user_id: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          id?: string
          linked_asset_id?: string | null
          linked_generation_id?: string | null
          metadata?: Json
          notes?: string | null
          position?: number
          stage?: string
          title?: string
          updated_at?: string
          user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_cards_linked_asset_id_fkey"
            columns: ["linked_asset_id"]
            isOneToOne: false
            referencedRelation: "library_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_cards_linked_generation_id_fkey"
            columns: ["linked_generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_cards_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string
          description: string | null
          id: string
          metadata: Json
          name: string
          project_id: string | null
          stages: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          name?: string
          project_id?: string | null
          stages?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          name?: string
          project_id?: string | null
          stages?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_credit: {
        Args: {
          p_limit: number
          p_month: string
          p_n: number
          p_user_id: string
        }
        Returns: number
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
