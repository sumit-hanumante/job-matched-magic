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
      job_embeddings: {
        Row: {
          created_at: string | null
          embedding: string
          id: string
          job_id: string | null
        }
        Insert: {
          created_at?: string | null
          embedding: string
          id?: string
          job_id?: string | null
        }
        Update: {
          created_at?: string | null
          embedding?: string
          id?: string
          job_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_embeddings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_matches: {
        Row: {
          company_match_score: number | null
          created_at: string | null
          id: string
          is_shown: boolean | null
          job_id: string
          location_match_score: number | null
          match_score: number
          salary_match_score: number | null
          skill_match_score: number | null
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          company_match_score?: number | null
          created_at?: string | null
          id?: string
          is_shown?: boolean | null
          job_id: string
          location_match_score?: number | null
          match_score: number
          salary_match_score?: number | null
          skill_match_score?: number | null
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          company_match_score?: number | null
          created_at?: string | null
          id?: string
          is_shown?: boolean | null
          job_id?: string
          location_match_score?: number | null
          match_score?: number
          salary_match_score?: number | null
          skill_match_score?: number | null
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_matches_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          applicant_count: number | null
          apply_url: string
          company: string
          description: string
          external_job_id: string | null
          id: string
          last_scraped_at: string | null
          location: string
          posted_date: string | null
          requirements: string[] | null
          salary_max: number | null
          salary_min: number | null
          salary_range: string | null
          source: string
          title: string
        }
        Insert: {
          applicant_count?: number | null
          apply_url: string
          company: string
          description: string
          external_job_id?: string | null
          id?: string
          last_scraped_at?: string | null
          location: string
          posted_date?: string | null
          requirements?: string[] | null
          salary_max?: number | null
          salary_min?: number | null
          salary_range?: string | null
          source?: string
          title: string
        }
        Update: {
          applicant_count?: number | null
          apply_url?: string
          company?: string
          description?: string
          external_job_id?: string | null
          id?: string
          last_scraped_at?: string | null
          location?: string
          posted_date?: string | null
          requirements?: string[] | null
          salary_max?: number | null
          salary_min?: number | null
          salary_range?: string | null
          source?: string
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          email_address: string | null
          full_name: string | null
          id: string
          preferred_locations: string[] | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          email_address?: string | null
          full_name?: string | null
          id: string
          preferred_locations?: string[] | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          email_address?: string | null
          full_name?: string | null
          id?: string
          preferred_locations?: string[] | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      resumes: {
        Row: {
          content_type: string | null
          created_at: string | null
          education: string | null
          embedding: string | null
          experience: string | null
          extracted_skills: string[] | null
          file_name: string | null
          file_path: string | null
          id: string
          max_salary: number | null
          min_salary: number | null
          order_index: number
          personal_information: Json | null
          possible_job_titles: string[] | null
          preferred_companies: string[] | null
          preferred_locations: string[] | null
          preferred_work_type: string | null
          projects: string | null
          resume_text: string | null
          status: string | null
          summary: string | null
          user_id: string
          years_of_experience: number | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string | null
          education?: string | null
          embedding?: string | null
          experience?: string | null
          extracted_skills?: string[] | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          max_salary?: number | null
          min_salary?: number | null
          order_index?: number
          personal_information?: Json | null
          possible_job_titles?: string[] | null
          preferred_companies?: string[] | null
          preferred_locations?: string[] | null
          preferred_work_type?: string | null
          projects?: string | null
          resume_text?: string | null
          status?: string | null
          summary?: string | null
          user_id: string
          years_of_experience?: number | null
        }
        Update: {
          content_type?: string | null
          created_at?: string | null
          education?: string | null
          embedding?: string | null
          experience?: string | null
          extracted_skills?: string[] | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          max_salary?: number | null
          min_salary?: number | null
          order_index?: number
          personal_information?: Json | null
          possible_job_titles?: string[] | null
          preferred_companies?: string[] | null
          preferred_locations?: string[] | null
          preferred_work_type?: string | null
          projects?: string | null
          resume_text?: string | null
          status?: string | null
          summary?: string | null
          user_id?: string
          years_of_experience?: number | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          github_url: string | null
          id: string
          job_alerts: boolean | null
          job_search_status: string | null
          linkedin_url: string | null
          portfolio_url: string | null
          preferred_job_types: string[] | null
          preferred_locations: string[] | null
          preferred_salary_range: unknown | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          github_url?: string | null
          id: string
          job_alerts?: boolean | null
          job_search_status?: string | null
          linkedin_url?: string | null
          portfolio_url?: string | null
          preferred_job_types?: string[] | null
          preferred_locations?: string[] | null
          preferred_salary_range?: unknown | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          github_url?: string | null
          id?: string
          job_alerts?: boolean | null
          job_search_status?: string | null
          linkedin_url?: string | null
          portfolio_url?: string | null
          preferred_job_types?: string[] | null
          preferred_locations?: string[] | null
          preferred_salary_range?: unknown | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      match_jobs: {
        Args: { candidate_vector: string }
        Returns: {
          job_id: string
          title: string
          distance: number
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
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
