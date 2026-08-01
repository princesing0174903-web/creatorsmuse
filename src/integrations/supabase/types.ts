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
      brand_knowledge_chunks: {
        Row: {
          brand_id: string | null
          chunk_index: number
          content: string
          created_at: string
          doc_id: string
          embedding: string | null
          id: string
          metadata: Json
          token_estimate: number
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          chunk_index?: number
          content: string
          created_at?: string
          doc_id: string
          embedding?: string | null
          id?: string
          metadata?: Json
          token_estimate?: number
          user_id: string
        }
        Update: {
          brand_id?: string | null
          chunk_index?: number
          content?: string
          created_at?: string
          doc_id?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          token_estimate?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_knowledge_chunks_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_knowledge_chunks_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "brand_knowledge_docs"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_knowledge_docs: {
        Row: {
          brand_id: string | null
          byte_size: number | null
          chunk_count: number
          created_at: string
          error: string | null
          id: string
          metadata: Json
          mime_type: string | null
          source_type: string
          source_url: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          byte_size?: number | null
          chunk_count?: number
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json
          mime_type?: string | null
          source_type?: string
          source_url?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string | null
          byte_size?: number | null
          chunk_count?: number
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json
          mime_type?: string | null
          source_type?: string
          source_url?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_knowledge_docs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_learning_signals: {
        Row: {
          asset_id: string | null
          asset_type: string | null
          brand_id: string | null
          created_at: string
          detail: Json
          final_text: string | null
          generation_id: string | null
          id: string
          original_text: string | null
          signal: string
          user_id: string
          weight: number
        }
        Insert: {
          asset_id?: string | null
          asset_type?: string | null
          brand_id?: string | null
          created_at?: string
          detail?: Json
          final_text?: string | null
          generation_id?: string | null
          id?: string
          original_text?: string | null
          signal: string
          user_id: string
          weight?: number
        }
        Update: {
          asset_id?: string | null
          asset_type?: string | null
          brand_id?: string | null
          created_at?: string
          detail?: Json
          final_text?: string | null
          generation_id?: string | null
          id?: string
          original_text?: string | null
          signal?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "brand_learning_signals_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "library_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_learning_signals_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_learning_signals_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_memory_versions: {
        Row: {
          brand_id: string
          change_source: string
          changed_fields: string[]
          created_at: string
          id: string
          note: string | null
          snapshot: Json
          user_id: string
          version: number
        }
        Insert: {
          brand_id: string
          change_source?: string
          changed_fields?: string[]
          created_at?: string
          id?: string
          note?: string | null
          snapshot?: Json
          user_id: string
          version: number
        }
        Update: {
          brand_id?: string
          change_source?: string
          changed_fields?: string[]
          created_at?: string
          id?: string
          note?: string | null
          snapshot?: Json
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "brand_memory_versions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_profiles: {
        Row: {
          accent_color: string | null
          approved_phrases: string[]
          banned_words: string[]
          competitors: string[]
          content_pillars: string[]
          created_at: string
          cta_style: string | null
          emoji_rules: string
          formatting_preferences: string | null
          hashtags: string[]
          id: string
          is_default: boolean
          keywords: string[]
          learned_insights: Json
          links: Json
          logo_url: string | null
          memory_version: number
          metadata: Json
          mission: string | null
          name: string
          platform_rules: Json
          primary_color: string | null
          reading_level: string | null
          target_audience: string | null
          tone: string | null
          updated_at: string
          user_id: string
          vision: string | null
          vocabulary: string[]
          writing_style: string | null
        }
        Insert: {
          accent_color?: string | null
          approved_phrases?: string[]
          banned_words?: string[]
          competitors?: string[]
          content_pillars?: string[]
          created_at?: string
          cta_style?: string | null
          emoji_rules?: string
          formatting_preferences?: string | null
          hashtags?: string[]
          id?: string
          is_default?: boolean
          keywords?: string[]
          learned_insights?: Json
          links?: Json
          logo_url?: string | null
          memory_version?: number
          metadata?: Json
          mission?: string | null
          name: string
          platform_rules?: Json
          primary_color?: string | null
          reading_level?: string | null
          target_audience?: string | null
          tone?: string | null
          updated_at?: string
          user_id: string
          vision?: string | null
          vocabulary?: string[]
          writing_style?: string | null
        }
        Update: {
          accent_color?: string | null
          approved_phrases?: string[]
          banned_words?: string[]
          competitors?: string[]
          content_pillars?: string[]
          created_at?: string
          cta_style?: string | null
          emoji_rules?: string
          formatting_preferences?: string | null
          hashtags?: string[]
          id?: string
          is_default?: boolean
          keywords?: string[]
          learned_insights?: Json
          links?: Json
          logo_url?: string | null
          memory_version?: number
          metadata?: Json
          mission?: string | null
          name?: string
          platform_rules?: Json
          primary_color?: string | null
          reading_level?: string | null
          target_audience?: string | null
          tone?: string | null
          updated_at?: string
          user_id?: string
          vision?: string | null
          vocabulary?: string[]
          writing_style?: string | null
        }
        Relationships: []
      }
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
      generation_events: {
        Row: {
          created_at: string
          detail: Json
          event: string
          generation_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: Json
          event: string
          generation_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          detail?: Json
          event?: string
          generation_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_events_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_quality: {
        Row: {
          brand_consistency: number
          brand_id: string | null
          created_at: string
          cta_quality: number
          detail: Json
          generation_id: string
          grammar: number
          id: string
          notes: string | null
          overall: number
          platform_optimization: number
          readability: number
          tone_match: number
          user_id: string
        }
        Insert: {
          brand_consistency?: number
          brand_id?: string | null
          created_at?: string
          cta_quality?: number
          detail?: Json
          generation_id: string
          grammar?: number
          id?: string
          notes?: string | null
          overall?: number
          platform_optimization?: number
          readability?: number
          tone_match?: number
          user_id: string
        }
        Update: {
          brand_consistency?: number
          brand_id?: string | null
          created_at?: string
          cta_quality?: number
          detail?: Json
          generation_id?: string
          grammar?: number
          id?: string
          notes?: string | null
          overall?: number
          platform_optimization?: number
          readability?: number
          tone_match?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_quality_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_quality_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "generations"
            referencedColumns: ["id"]
          },
        ]
      }
      generations: {
        Row: {
          attempt: number
          cancel_requested: boolean
          cancelled_at: string | null
          created_at: string
          credits_used: number
          error: string | null
          error_code: string | null
          finished_at: string | null
          id: string
          input: Json
          kind: string
          max_attempts: number
          model: string | null
          output: Json
          parent_id: string | null
          progress: number
          project_id: string | null
          queued_at: string | null
          started_at: string | null
          status: string
          topic: string | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          attempt?: number
          cancel_requested?: boolean
          cancelled_at?: string | null
          created_at?: string
          credits_used?: number
          error?: string | null
          error_code?: string | null
          finished_at?: string | null
          id?: string
          input?: Json
          kind: string
          max_attempts?: number
          model?: string | null
          output?: Json
          parent_id?: string | null
          progress?: number
          project_id?: string | null
          queued_at?: string | null
          started_at?: string | null
          status?: string
          topic?: string | null
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          attempt?: number
          cancel_requested?: boolean
          cancelled_at?: string | null
          created_at?: string
          credits_used?: number
          error?: string | null
          error_code?: string | null
          finished_at?: string | null
          id?: string
          input?: Json
          kind?: string
          max_attempts?: number
          model?: string | null
          output?: Json
          parent_id?: string | null
          progress?: number
          project_id?: string | null
          queued_at?: string | null
          started_at?: string | null
          status?: string
          topic?: string | null
          updated_at?: string
          user_id?: string
          version?: number
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
      library_asset_collections: {
        Row: {
          added_at: string
          asset_id: string
          collection_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          asset_id: string
          collection_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          asset_id?: string
          collection_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_asset_collections_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "library_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_asset_collections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "library_collections"
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
          deleted_at: string | null
          favorite: boolean
          generation_id: string | null
          id: string
          media_url: string | null
          metadata: Json
          pinned: boolean
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
          deleted_at?: string | null
          favorite?: boolean
          generation_id?: string | null
          id?: string
          media_url?: string | null
          metadata?: Json
          pinned?: boolean
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
          deleted_at?: string | null
          favorite?: boolean
          generation_id?: string | null
          id?: string
          media_url?: string | null
          metadata?: Json
          pinned?: boolean
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
      library_collections: {
        Row: {
          color: string
          created_at: string
          description: string | null
          icon: string
          id: string
          metadata: Json
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          metadata?: Json
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          metadata?: Json
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          brand_id: string | null
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
          brand_id?: string | null
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
          brand_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "projects_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brand_profiles"
            referencedColumns: ["id"]
          },
        ]
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
          drafts: Json
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
          drafts?: Json
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
          drafts?: Json
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
          archived: boolean
          assigned_user_id: string | null
          attachments: Json
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          linked_asset_id: string | null
          linked_generation_id: string | null
          metadata: Json
          notes: string | null
          platform: string
          position: number
          priority: string
          progress: number
          project_id: string | null
          stage: string
          status: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
          workflow_id: string
        }
        Insert: {
          archived?: boolean
          assigned_user_id?: string | null
          attachments?: Json
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          linked_asset_id?: string | null
          linked_generation_id?: string | null
          metadata?: Json
          notes?: string | null
          platform?: string
          position?: number
          priority?: string
          progress?: number
          project_id?: string | null
          stage?: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
          workflow_id: string
        }
        Update: {
          archived?: boolean
          assigned_user_id?: string | null
          attachments?: Json
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          linked_asset_id?: string | null
          linked_generation_id?: string | null
          metadata?: Json
          notes?: string | null
          platform?: string
          position?: number
          priority?: string
          progress?: number
          project_id?: string | null
          stage?: string
          status?: string
          tags?: string[]
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
            foreignKeyName: "workflow_cards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      workflow_events: {
        Row: {
          card_id: string | null
          created_at: string
          detail: Json
          event: string
          id: string
          user_id: string
          workflow_id: string | null
        }
        Insert: {
          card_id?: string | null
          created_at?: string
          detail?: Json
          event: string
          id?: string
          user_id: string
          workflow_id?: string | null
        }
        Update: {
          card_id?: string | null
          created_at?: string
          detail?: Json
          event?: string
          id?: string
          user_id?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_events_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "workflow_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_events_workflow_id_fkey"
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
      match_brand_knowledge: {
        Args: {
          match_count?: number
          p_brand_id: string
          p_user_id: string
          query_embedding: string
        }
        Returns: {
          content: string
          doc_id: string
          id: string
          similarity: number
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
