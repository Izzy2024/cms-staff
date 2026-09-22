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
      auditoria: {
        Row: {
          accion: string
          datos_anteriores: Json | null
          datos_nuevos: Json | null
          fecha: string
          id: number
          registro_id: string
          tabla: string
          usuario_id: string | null
        }
        Insert: {
          accion: string
          datos_anteriores?: Json | null
          datos_nuevos?: Json | null
          fecha?: string
          id?: never
          registro_id: string
          tabla: string
          usuario_id?: string | null
        }
        Update: {
          accion?: string
          datos_anteriores?: Json | null
          datos_nuevos?: Json | null
          fecha?: string
          id?: never
          registro_id?: string
          tabla?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      clientes: {
        Row: {
          activo_manual: boolean | null
          cedula: string
          created_at: string
          email: string | null
          fecha_nacimiento: string | null
          id: string
          nombre: string
          telefono: string
          updated_at: string
        }
        Insert: {
          activo_manual?: boolean | null
          cedula: string
          created_at?: string
          email?: string | null
          fecha_nacimiento?: string | null
          id?: string
          nombre: string
          telefono: string
          updated_at?: string
        }
        Update: {
          activo_manual?: boolean | null
          cedula?: string
          created_at?: string
          email?: string | null
          fecha_nacimiento?: string | null
          id?: string
          nombre?: string
          telefono?: string
          updated_at?: string
        }
        Relationships: []
      }
      documentos_poliza: {
        Row: {
          fecha_subida: string
          id: string
          nombre_archivo: string
          poliza_id: string
          storage_path: string
          tipo_documento: string
        }
        Insert: {
          fecha_subida?: string
          id?: string
          nombre_archivo: string
          poliza_id: string
          storage_path: string
          tipo_documento: string
        }
        Update: {
          fecha_subida?: string
          id?: string
          nombre_archivo?: string
          poliza_id?: string
          storage_path?: string
          tipo_documento?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_poliza_poliza_id_fkey"
            columns: ["poliza_id"]
            isOneToOne: false
            referencedRelation: "polizas"
            referencedColumns: ["id"]
          },
        ]
      }
      polizas: {
        Row: {
          aseguradora: string
          beneficios: string
          cliente_id: string
          cobertura_auto: string | null
          conducto_pago: string | null
          corredor: string | null
          created_at: string
          detalle_bien: string
          dia_pago: string | null
          frecuencia_pago: string | null
          id: string
          numero_cuotas: number | null
          numero_poliza: string
          observaciones: string
          poliza_anterior_id: string | null
          prima: number
          tipo_seguro: string
          updated_at: string
          vigencia_fin: string
          vigencia_inicio: string
        }
        Insert: {
          aseguradora: string
          beneficios?: string
          cliente_id: string
          cobertura_auto?: string | null
          conducto_pago?: string | null
          corredor?: string | null
          created_at?: string
          detalle_bien?: string
          dia_pago?: string | null
          frecuencia_pago?: string | null
          id?: string
          numero_cuotas?: number | null
          numero_poliza: string
          observaciones?: string
          poliza_anterior_id?: string | null
          prima?: number
          tipo_seguro: string
          updated_at?: string
          vigencia_fin: string
          vigencia_inicio: string
        }
        Update: {
          aseguradora?: string
          beneficios?: string
          cliente_id?: string
          cobertura_auto?: string | null
          conducto_pago?: string | null
          corredor?: string | null
          created_at?: string
          detalle_bien?: string
          dia_pago?: string | null
          frecuencia_pago?: string | null
          id?: string
          numero_cuotas?: number | null
          numero_poliza?: string
          observaciones?: string
          poliza_anterior_id?: string | null
          prima?: number
          tipo_seguro?: string
          updated_at?: string
          vigencia_fin?: string
          vigencia_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "polizas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polizas_poliza_anterior_id_fkey"
            columns: ["poliza_anterior_id"]
            isOneToOne: false
            referencedRelation: "polizas"
            referencedColumns: ["id"]
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
