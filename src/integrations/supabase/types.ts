export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          advisor_id: string
          created_at: string
          created_by: string
          duration_min: number
          id: string
          location: string | null
          notes: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          advisor_id: string
          created_at?: string
          created_by: string
          duration_min?: number
          id?: string
          location?: string | null
          notes?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          created_at?: string
          created_by?: string
          duration_min?: number
          id?: string
          location?: string | null
          notes?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          mime_type: string | null
          name: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          size_bytes: number | null
          status: Database["public"]["Enums"]["document_status"]
          storage_path: string
          student_id: string
          type: Database["public"]["Enums"]["document_type"]
          uploaded_at: string
        }
        Insert: {
          id?: string
          mime_type?: string | null
          name: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number | null
          status?: Database["public"]["Enums"]["document_status"]
          storage_path: string
          student_id: string
          type?: Database["public"]["Enums"]["document_type"]
          uploaded_at?: string
        }
        Update: {
          id?: string
          mime_type?: string | null
          name?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number | null
          status?: Database["public"]["Enums"]["document_status"]
          storage_path?: string
          student_id?: string
          type?: Database["public"]["Enums"]["document_type"]
          uploaded_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          edited_at: string | null
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          edited_at?: string | null
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          blocked_at: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          blocked_at?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          blocked_at?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      schools: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          address: string | null
          city: string | null
          country: string | null
          website: string | null
          email: string | null
          phone: string | null
          description: string | null
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          address?: string | null
          city?: string | null
          country?: string | null
          website?: string | null
          email?: string | null
          phone?: string | null
          description?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          logo_url?: string | null
          address?: string | null
          city?: string | null
          country?: string | null
          website?: string | null
          email?: string | null
          phone?: string | null
          description?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      school_programs: {
        Row: {
          id: string
          school_id: string
          name: string
          description: string | null
          domain: string | null
          level: string | null
          duration: string | null
          language: string | null
          tuition_fee: number | null
          requirements: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          name: string
          description?: string | null
          domain?: string | null
          level?: string | null
          duration?: string | null
          language?: string | null
          tuition_fee?: number | null
          requirements?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          name?: string
          description?: string | null
          domain?: string | null
          level?: string | null
          duration?: string | null
          language?: string | null
          tuition_fee?: number | null
          requirements?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_applications: {
        Row: {
          id: string
          student_id: string
          program_id: string
          school_id: string
          status: string
          motivation_letter: string | null
          counselor_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          program_id: string
          school_id: string
          status?: string
          motivation_letter?: string | null
          counselor_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          program_id?: string
          school_id?: string
          status?: string
          motivation_letter?: string | null
          counselor_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_files: {
        Row: {
          advisor_id: string | null
          bio: string | null
          created_at: string
          id: string
          progress: number
          status: Database["public"]["Enums"]["file_status"]
          student_id: string
          target_country: string | null
          target_level: string | null
          target_program: string | null
          updated_at: string
        }
        Insert: {
          advisor_id?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          progress?: number
          status?: Database["public"]["Enums"]["file_status"]
          student_id: string
          target_country?: string | null
          target_level?: string | null
          target_program?: string | null
          updated_at?: string
        }
        Update: {
          advisor_id?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          progress?: number
          status?: Database["public"]["Enums"]["file_status"]
          student_id?: string
          target_country?: string | null
          target_level?: string | null
          target_program?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      commercial_leads: {
        Row: {
          id: string
          type: string
          title: string
          description: string | null
          contact_name: string | null
          contact_email: string | null
          contact_phone: string | null
          status: string
          value: number | null
          scheduled_at: string | null
          closed_at: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: string
          title: string
          description?: string | null
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          status?: string
          value?: number | null
          scheduled_at?: string | null
          closed_at?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: string
          title?: string
          description?: string | null
          contact_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          status?: string
          value?: number | null
          scheduled_at?: string | null
          closed_at?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_tasks: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          status: string
          assigned_to: string | null
          due_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string | null
          status?: string
          assigned_to?: string | null
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          description?: string | null
          status?: string
          assigned_to?: string | null
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_features: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          acceptance_criteria: string | null
          priority: string
          status: string
          r_and_d_comment: string | null
          estimated_hours: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string | null
          acceptance_criteria?: string | null
          priority?: string
          status?: string
          r_and_d_comment?: string | null
          estimated_hours?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          description?: string | null
          acceptance_criteria?: string | null
          priority?: string
          status?: string
          r_and_d_comment?: string | null
          estimated_hours?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          client: string | null
          branch: string
          status: string
          priority: string
          start_date: string | null
          end_date: string | null
          budget: number | null
          objectives: string | null
          target_audience: string | null
          tech_constraints: string | null
          r_and_d_notes: string | null
          validated_spec: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          client?: string | null
          branch?: string
          status?: string
          priority?: string
          start_date?: string | null
          end_date?: string | null
          budget?: number | null
          objectives?: string | null
          target_audience?: string | null
          tech_constraints?: string | null
          r_and_d_notes?: string | null
          validated_spec?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          client?: string | null
          branch?: string
          status?: string
          priority?: string
          start_date?: string | null
          end_date?: string | null
          budget?: number | null
          objectives?: string | null
          target_audience?: string | null
          tech_constraints?: string | null
          r_and_d_notes?: string | null
          validated_spec?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          date: string
          type: string
          amount: number
          category: string
          branch: string
          description: string | null
          reference: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          date?: string
          type: string
          amount: number
          category: string
          branch?: string
          description?: string | null
          reference?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          date?: string
          type?: string
          amount?: number
          category?: string
          branch?: string
          description?: string | null
          reference?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      personnel: {
        Row: {
          id: string
          full_name: string
          email: string | null
          phone: string | null
          address: string | null
          birth_date: string | null
          hire_date: string | null
          department: string
          last_diploma: string | null
          mission: string | null
          cv_path: string | null
          status: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          birth_date?: string | null
          hire_date?: string | null
          department: string
          last_diploma?: string | null
          mission?: string | null
          cv_path?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          birth_date?: string | null
          hire_date?: string | null
          department?: string
          last_diploma?: string | null
          mission?: string | null
          cv_path?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_assigned_advisor: {
        Args: { _advisor: string; _student: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "etudiant" | "conseiller" | "admin" | "comptable" | "chef_projet" | "commercial" | "rh" | "ecole"
      appointment_status: "programme" | "termine" | "annule"
      document_status: "en_attente" | "valide" | "rejete"
      document_type:
        | "identite"
        | "diplome"
        | "releve_notes"
        | "lettre_motivation"
        | "cv"
        | "autre"
      file_status:
        | "nouveau"
        | "en_cours"
        | "soumis"
        | "accepte"
        | "refuse"
        | "archive"
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
      app_role: ["etudiant", "conseiller", "admin", "comptable", "chef_projet", "commercial", "rh", "ecole"],
      appointment_status: ["programme", "termine", "annule"],
      document_status: ["en_attente", "valide", "rejete"],
      document_type: [
        "identite",
        "diplome",
        "releve_notes",
        "lettre_motivation",
        "cv",
        "autre",
      ],
      file_status: [
        "nouveau",
        "en_cours",
        "soumis",
        "accepte",
        "refuse",
        "archive",
      ],
    },
  },
} as const
