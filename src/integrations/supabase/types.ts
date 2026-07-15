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
      machine_models: {
        Row: {
          created_at: string
          id: string
          nome: string
          visivel_registro: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          visivel_registro?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          visivel_registro?: boolean
        }
        Relationships: []
      }
      machine_process_templates: {
        Row: {
          id: string
          model_id: string
          nome: string
          ordem: number
          peso: number
        }
        Insert: {
          id?: string
          model_id: string
          nome: string
          ordem?: number
          peso: number
        }
        Update: {
          id?: string
          model_id?: string
          nome?: string
          ordem?: number
          peso?: number
        }
        Relationships: [
          {
            foreignKeyName: "machine_process_templates_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "machine_models"
            referencedColumns: ["id"]
          },
        ]
      }
      machine_processes: {
        Row: {
          concluido: boolean
          concluido_em: string | null
          id: string
          machine_id: string
          nome: string
          observacao: string | null
          ordem: number
          peso: number
        }
        Insert: {
          concluido?: boolean
          concluido_em?: string | null
          id?: string
          machine_id: string
          nome: string
          observacao?: string | null
          ordem?: number
          peso: number
        }
        Update: {
          concluido?: boolean
          concluido_em?: string | null
          id?: string
          machine_id?: string
          nome?: string
          observacao?: string | null
          ordem?: number
          peso?: number
        }
        Relationships: [
          {
            foreignKeyName: "machine_processes_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
        ]
      }
      machines: {
        Row: {
          cliente: string
          created_at: string
          data_entrega: string
          id: string
          modelo_id: string | null
          modelo_nome: string | null
          nome: string
          numero_serie: string
          progresso: number
          status: Database["public"]["Enums"]["machine_status"]
        }
        Insert: {
          cliente: string
          created_at?: string
          data_entrega: string
          id?: string
          modelo_id?: string | null
          modelo_nome?: string | null
          nome: string
          numero_serie: string
          progresso?: number
          status?: Database["public"]["Enums"]["machine_status"]
        }
        Update: {
          cliente?: string
          created_at?: string
          data_entrega?: string
          id?: string
          modelo_id?: string | null
          modelo_nome?: string | null
          nome?: string
          numero_serie?: string
          progresso?: number
          status?: Database["public"]["Enums"]["machine_status"]
        }
        Relationships: [
          {
            foreignKeyName: "machines_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "machine_models"
            referencedColumns: ["id"]
          },
        ]
      }
      manutencoes: {
        Row: {
          cliente: string
          criado_em: string
          data_visita: string
          id: string
          link_relatorio: string | null
          numero_serie: string
          relatorio: string
          relatorio_id: string | null
          tecnico: string
        }
        Insert: {
          cliente: string
          criado_em?: string
          data_visita: string
          id?: string
          link_relatorio?: string | null
          numero_serie: string
          relatorio: string
          relatorio_id?: string | null
          tecnico: string
        }
        Update: {
          cliente?: string
          criado_em?: string
          data_visita?: string
          id?: string
          link_relatorio?: string | null
          numero_serie?: string
          relatorio?: string
          relatorio_id?: string | null
          tecnico?: string
        }
        Relationships: [
          {
            foreignKeyName: "manutencoes_numero_serie_fkey"
            columns: ["numero_serie"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["numero_serie"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      machine_status:
        | "engenharia"
        | "compras"
        | "producao"
        | "embarque"
        | "entregue"
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
      machine_status: [
        "engenharia",
        "compras",
        "producao",
        "embarque",
        "entregue",
      ],
    },
  },
} as const
