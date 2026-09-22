-- Snapshot de referencia del esquema public (no es una migracion). Regenerar: ver commit que introdujo este archivo.



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."clientes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "cedula" "text" NOT NULL,
    "telefono" "text" NOT NULL,
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "activo_manual" boolean,
    "fecha_nacimiento" "date"
);


ALTER TABLE "public"."clientes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documentos_poliza" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "poliza_id" "uuid" NOT NULL,
    "nombre_archivo" "text" NOT NULL,
    "tipo_documento" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "fecha_subida" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."documentos_poliza" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."polizas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cliente_id" "uuid" NOT NULL,
    "aseguradora" "text" NOT NULL,
    "tipo_seguro" "text" NOT NULL,
    "detalle_bien" "text" DEFAULT ''::"text" NOT NULL,
    "numero_poliza" "text" NOT NULL,
    "vigencia_inicio" "date" NOT NULL,
    "vigencia_fin" "date" NOT NULL,
    "prima" numeric DEFAULT 0 NOT NULL,
    "observaciones" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "beneficios" "text" DEFAULT ''::"text" NOT NULL,
    "cobertura_auto" "text",
    "frecuencia_pago" "text",
    "conducto_pago" "text",
    "dia_pago" "text",
    "numero_cuotas" integer DEFAULT 1,
    "corredor" "text"
);


ALTER TABLE "public"."polizas" OWNER TO "postgres";


COMMENT ON COLUMN "public"."polizas"."cobertura_auto" IS 'Cobertura de auto: Cobertura completa | Solo a terceros';



COMMENT ON COLUMN "public"."polizas"."frecuencia_pago" IS 'Frecuencia de pago: Anual | Semestral | Trimestral | Mensual';



COMMENT ON COLUMN "public"."polizas"."conducto_pago" IS 'Conducto de pago: Voluntaria | TCR | ACH';



COMMENT ON COLUMN "public"."polizas"."dia_pago" IS 'Día o fecha de pago estipulado en la póliza';



COMMENT ON COLUMN "public"."polizas"."numero_cuotas" IS 'Cantidad total de cuotas en las que se fracciona el pago de la prima';



ALTER TABLE ONLY "public"."clientes"
    ADD CONSTRAINT "clientes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documentos_poliza"
    ADD CONSTRAINT "documentos_poliza_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."polizas"
    ADD CONSTRAINT "polizas_pkey" PRIMARY KEY ("id");



CREATE INDEX "documentos_poliza_poliza_id_idx" ON "public"."documentos_poliza" USING "btree" ("poliza_id");



CREATE INDEX "polizas_cliente_id_idx" ON "public"."polizas" USING "btree" ("cliente_id");



ALTER TABLE ONLY "public"."documentos_poliza"
    ADD CONSTRAINT "documentos_poliza_poliza_id_fkey" FOREIGN KEY ("poliza_id") REFERENCES "public"."polizas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."polizas"
    ADD CONSTRAINT "polizas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE CASCADE;



CREATE POLICY "agente_all_clientes" ON "public"."clientes" TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'agente'::"text")) WITH CHECK (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'agente'::"text"));



CREATE POLICY "agente_all_documentos_poliza" ON "public"."documentos_poliza" TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'agente'::"text")) WITH CHECK (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'agente'::"text"));



CREATE POLICY "agente_all_polizas" ON "public"."polizas" TO "authenticated" USING (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'agente'::"text")) WITH CHECK (((("auth"."jwt"() -> 'app_metadata'::"text") ->> 'role'::"text") = 'agente'::"text"));



ALTER TABLE "public"."clientes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."documentos_poliza" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."polizas" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON TABLE "public"."clientes" TO "anon";
GRANT ALL ON TABLE "public"."clientes" TO "authenticated";
GRANT ALL ON TABLE "public"."clientes" TO "service_role";



GRANT ALL ON TABLE "public"."documentos_poliza" TO "anon";
GRANT ALL ON TABLE "public"."documentos_poliza" TO "authenticated";
GRANT ALL ON TABLE "public"."documentos_poliza" TO "service_role";



GRANT ALL ON TABLE "public"."polizas" TO "anon";
GRANT ALL ON TABLE "public"."polizas" TO "authenticated";
GRANT ALL ON TABLE "public"."polizas" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







