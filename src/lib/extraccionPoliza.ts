export interface ResultadoExtraccion {
  cliente: { nombre: string; cedula: string; telefono: string; email: string };
  poliza: {
    aseguradora: string;
    tipoSeguro: string;
    detalleBien: string;
    numeroPoliza: string;
    vigenciaInicio: string;
    vigenciaFin: string;
    prima: number;
    observaciones: string;
    beneficios: string;
  };
  avisos: string[];
}

export async function extraerPolizaDesdeArchivo(_archivo: File): Promise<ResultadoExtraccion> {
  throw new Error("no implementado en este worktree");
}
