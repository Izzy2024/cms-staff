export type TipoSeguro =
  | "Auto"
  | "Daños a Terceros"
  | "Incendio"
  | "Contenido"
  | "Vida"
  | "Accidentes Personales"
  | "Salud"
  | "Responsabilidad Civil"
  | "Fianza"
  | "Equipo Pesado"
  | "Otro";

export const TIPOS_SEGURO: TipoSeguro[] = [
  "Auto",
  "Daños a Terceros",
  "Incendio",
  "Contenido",
  "Vida",
  "Accidentes Personales",
  "Salud",
  "Responsabilidad Civil",
  "Fianza",
  "Equipo Pesado",
  "Otro",
];

export type TipoDocumento =
  | "cedula"
  | "licencia"
  | "registroVehicular"
  | "proforma"
  | "cotizacion"
  | "poliza"
  | "endoso"
  | "kyc"
  | "otro";

export interface Cliente {
  id: string;
  nombre: string;
  cedula: string;
  telefono: string;
  email?: string;
}

export interface Poliza {
  id: string;
  clienteId: string;
  aseguradora: string;
  tipoSeguro: TipoSeguro;
  detalleBien: string;
  numeroPoliza: string;
  vigenciaInicio: string;
  vigenciaFin: string;
  prima: number;
  observaciones: string;
}

export interface DocumentoPoliza {
  id: string;
  nombreArchivo: string;
  tipoDocumento: TipoDocumento;
  urlStorage: string;
  fechaSubida: string;
}
