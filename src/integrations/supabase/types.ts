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
          full_name: string | null
          id: string
          preferred_locations: string[] | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id: string
          preferred_locations?: string[] | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
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
          experience: string | null
          extracted_skills: string[] | null
          file_name: string | null
          file_path: string | null
          id: string
          max_salary: number | null
          min_salary: number | null
          preferred_companies: string[] | null
          preferred_locations: string[] | null
          preferred_work_type: string | null
          salary: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          content_type?: string | null
          experience?: string | null
          extracted_skills?: string[] | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          max_salary?: number | null
          min_salary?: number | null
          preferred_companies?: string[] | null
          preferred_locations?: string[] | null
          preferred_work_type?: string | null
          salary?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          content_type?: string | null
          experience?: string | null
          extracted_skills?: string[] | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          max_salary?: number | null
          min_salary?: number | null
          preferred_companies?: string[] | null
          preferred_locations?: string[] | null
          preferred_work_type?: string | null
          salary?: string | null
          status?: string | null
          user_id?: string
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
