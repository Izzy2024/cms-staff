import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calcularDiasRestantes,
  esClienteActivo,
  esRenovacionProxima,
  estadoClientePorFechas,
  obtenerCumpleanosProximos,
  obtenerRenovacionesProximas,
  textoDiasRestantes,
} from "./renovaciones.ts";
import type { ClienteConPolizas } from "./clientesRepo.ts";
import type { Cliente, Poliza } from "./types.ts";

const REFERENCIA = new Date(2026, 8, 22);

function poliza(overrides: Partial<Poliza> = {}): Poliza {
  return {
    id: "p1",
    clienteId: "c1",
    aseguradora: "ASSA",
    tipoSeguro: "Auto",
    detalleBien: "Vehículo",
    numeroPoliza: "POL-1",
    vigenciaInicio: "2026-01-01",
    vigenciaFin: "2026-10-02",
    prima: 100,
    observaciones: "",
    beneficios: "",
    ...overrides,
  };
}

function cliente(overrides: Partial<Cliente> = {}): Cliente {
  return {
    id: "c1",
    nombre: "Cliente Uno",
    cedula: "1-234-567",
    telefono: "6000-0000",
    ...overrides,
  };
}

function item(clienteNombre: string, vigenciaFin: string, clienteId = "c1"): ClienteConPolizas {
  return {
    cliente: cliente({ id: clienteId, nombre: clienteNombre }),
    polizas: [poliza({ clienteId, vigenciaFin })],
  };
}

describe("calcularDiasRestantes", () => {
  it("vence hoy -> 0", () => {
    expect(calcularDiasRestantes("2026-09-22", REFERENCIA)).toBe(0);
  });

  it("venció ayer -> -1", () => {
    expect(calcularDiasRestantes("2026-09-21", REFERENCIA)).toBe(-1);
  });

  it("en 29 días -> 29", () => {
    expect(calcularDiasRestantes("2026-10-21", REFERENCIA)).toBe(29);
  });

  it("formato con hora usa solo la fecha", () => {
    expect(calcularDiasRestantes("2026-10-01T00:00:00Z", REFERENCIA)).toBe(9);
  });

  it('"" o texto inválido -> null', () => {
    expect(calcularDiasRestantes("", REFERENCIA)).toBeNull();
    expect(calcularDiasRestantes("no-es-fecha", REFERENCIA)).toBeNull();
  });
});

describe("esRenovacionProxima", () => {
  it("30 -> true", () => {
    expect(esRenovacionProxima(30, REFERENCIA)).toBe(true);
  });

  it("31 -> false", () => {
    expect(esRenovacionProxima(31, REFERENCIA)).toBe(false);
  });

  it("-5 (vencida) -> true", () => {
    expect(esRenovacionProxima(-5, REFERENCIA)).toBe(true);
  });

  it("null -> false", () => {
    expect(esRenovacionProxima(null, REFERENCIA)).toBe(false);
  });
});

describe("textoDiasRestantes", () => {
  it("-1 -> Vencida", () => {
    expect(textoDiasRestantes(-1)).toBe("Vencida");
  });

  it("0 -> Vence hoy", () => {
    expect(textoDiasRestantes(0)).toBe("Vence hoy");
  });

  it("1 -> Vence en 1 día", () => {
    expect(textoDiasRestantes(1)).toBe("Vence en 1 día");
  });

  it("12 -> Vence en 12 días", () => {
    expect(textoDiasRestantes(12)).toBe("Vence en 12 días");
  });
});

describe("obtenerRenovacionesProximas", () => {
  it("incluye <=30 días y vencidas, excluye >30, ordena por días y luego por nombre", () => {
    const clientes: ClienteConPolizas[] = [
      item("Zeta", "2026-10-02", "cz"),
      item("Alfa", "2026-10-02", "ca"),
      item("Vencido", "2026-09-17", "cv"),
      item("Lejano", "2026-11-01", "cl"),
    ];
    const resultado = obtenerRenovacionesProximas(clientes, REFERENCIA);
    expect(resultado.map((r) => r.clienteNombre)).toEqual(["Vencido", "Alfa", "Zeta"]);
    expect(resultado.map((r) => r.diasRestantes)).toEqual([-5, 10, 10]);
  });
});

describe("estadoClientePorFechas y esClienteActivo (reloj congelado)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function congelarReloj(): void {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 22));
  }

  it("vigente + vencida -> activo con los días de la vigente más próxima", () => {
    congelarReloj();
    const estado = estadoClientePorFechas([
      poliza({ vigenciaFin: "2026-10-02" }),
      poliza({ vigenciaFin: "2026-09-17" }),
    ]);
    expect(estado).toEqual({ activo: true, diasRelevante: 10 });
  });

  it("solo vencidas -> inactivo con la vencida más reciente", () => {
    congelarReloj();
    const estado = estadoClientePorFechas([
      poliza({ vigenciaFin: "2026-09-17" }),
      poliza({ vigenciaFin: "2026-09-02" }),
    ]);
    expect(estado).toEqual({ activo: false, diasRelevante: -5 });
  });

  it("sin fechas válidas -> inactivo sin días relevantes", () => {
    congelarReloj();
    expect(estadoClientePorFechas([])).toEqual({ activo: false, diasRelevante: null });
    expect(estadoClientePorFechas([poliza({ vigenciaFin: "" })])).toEqual({
      activo: false,
      diasRelevante: null,
    });
  });

  it("activoManual true/false manda sobre las fechas", () => {
    congelarReloj();
    const vencidas = [poliza({ vigenciaFin: "2026-09-17" })];
    const vigentes = [poliza({ vigenciaFin: "2026-10-02" })];
    expect(esClienteActivo(cliente({ activoManual: true }), vencidas)).toBe(true);
    expect(esClienteActivo(cliente({ activoManual: false }), vigentes)).toBe(false);
  });

  it("null/undefined usa las fechas", () => {
    congelarReloj();
    const vencidas = [poliza({ vigenciaFin: "2026-09-17" })];
    const vigentes = [poliza({ vigenciaFin: "2026-10-02" })];
    expect(esClienteActivo(cliente({ activoManual: null }), vigentes)).toBe(true);
    expect(esClienteActivo(cliente({ activoManual: null }), vencidas)).toBe(false);
    expect(esClienteActivo(cliente({}), vigentes)).toBe(true);
    expect(esClienteActivo(cliente({}), vencidas)).toBe(false);
  });
});

describe("obtenerCumpleanosProximos", () => {
  function conCumpleanos(nombre: string, fechaNacimiento?: string, id = "c1"): ClienteConPolizas {
    return { cliente: cliente({ id, nombre, fechaNacimiento }), polizas: [] };
  }

  it("incluye cumpleaños dentro de 30 días y excluye los lejanos", () => {
    const resultado = obtenerCumpleanosProximos(
      [
        conCumpleanos("Cercano", "1990-09-25", "c1"),
        conCumpleanos("Lejano", "1990-11-01", "c2"),
      ],
      REFERENCIA,
    );
    expect(resultado.map((r) => r.clienteNombre)).toEqual(["Cercano"]);
    expect(resultado[0].diasRestantes).toBe(3);
  });

  it("cruce de año: referencia 20/12/2026, cumple 05/01 -> 16 días", () => {
    const resultado = obtenerCumpleanosProximos(
      [conCumpleanos("Enero", "1990-01-05", "c1")],
      new Date(2026, 11, 20),
    );
    expect(resultado).toHaveLength(1);
    expect(resultado[0].diasRestantes).toBe(16);
  });

  it("fecha inválida o vacía se excluye", () => {
    const resultado = obtenerCumpleanosProximos(
      [
        conCumpleanos("Invalido", "no-es-fecha", "c1"),
        conCumpleanos("Vacio", "", "c2"),
        conCumpleanos("SinFecha", undefined, "c3"),
      ],
      REFERENCIA,
    );
    expect(resultado).toEqual([]);
  });

  it("ordena por días", () => {
    const resultado = obtenerCumpleanosProximos(
      [
        conCumpleanos("Lejos", "1990-10-10", "c1"),
        conCumpleanos("Cerca", "1990-09-25", "c2"),
      ],
      REFERENCIA,
    );
    expect(resultado.map((r) => r.clienteNombre)).toEqual(["Cerca", "Lejos"]);
  });
});
