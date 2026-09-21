-- Migración para ampliar la tabla polizas con cobertura de auto y datos de pago
ALTER TABLE polizas
  ADD COLUMN IF NOT EXISTS cobertura_auto text,
  ADD COLUMN IF NOT EXISTS frecuencia_pago text,
  ADD COLUMN IF NOT EXISTS conducto_pago text,
  ADD COLUMN IF NOT EXISTS dia_pago text,
  ADD COLUMN IF NOT EXISTS numero_cuotas integer DEFAULT 1;

COMMENT ON COLUMN polizas.cobertura_auto IS 'Cobertura de auto: Cobertura completa | Solo a terceros';
COMMENT ON COLUMN polizas.frecuencia_pago IS 'Frecuencia de pago: Anual | Semestral | Trimestral | Mensual';
COMMENT ON COLUMN polizas.conducto_pago IS 'Conducto de pago: Voluntaria | TCR | ACH';
COMMENT ON COLUMN polizas.dia_pago IS 'Día o fecha de pago estipulado en la póliza';
COMMENT ON COLUMN polizas.numero_cuotas IS 'Cantidad total de cuotas en las que se fracciona el pago de la prima';
