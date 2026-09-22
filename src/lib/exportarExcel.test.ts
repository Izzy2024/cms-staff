import { describe, expect, it } from "vitest";
import {
  filasCartera,
  filasRenovaciones,
  formatearFechaDma,
} from "./exportarExcel.ts";
import type { ClienteConPolizas } from "./clientesRepo.ts";
import type { ItemRenovacion } from "./renovaciones.ts";
import type { Cliente, Poliza } from "./types.ts";

const REFERENCIA = new Date(2026, 8, 22);

function poliza(overrides: Partial<Poliza> = {}): Poliza {
  return {
    id: "p1",
    clienteId: "c1",
    aseguradora: "ASSA",
    tipoSeguro: "Auto",
    detalleBien: "Sedan",
    numeroPoliza: "POL-100",
    corredor: "Corredor Uno",
    vigenciaInicio: "2026-01-01",
    vigenciaFin: "2027-01-01",
    prima: 1250.5,
    observaciones: "Ninguna",
    beneficios: "",
    frecuenciaPago: "Mensual",
    conductoPago: "ACH",
    ...overrides,
  };
}

function cliente(overrides: Partial<Cliente> = {}): Cliente {
  return {
    id: "c1",
    nombre: "Juan Perez",
    cedula: "8-123-456",
    telefono: "6000-1111",
    email: "juan@ejemplo.com",
    ...overrides,
  };
}

describe("formatearFechaDma", () => {
  it("convierte fecha ISO YYYY-MM-DD a formato dd/mm/aaaa", () => {
    expect(formatearFechaDma("2026-09-22")).toBe("22/09/2026");
    expect(formatearFechaDma("2026-01-05")).toBe("05/01/2026");
  });

  it("retorna string vacio ante cadenas vacias o invalidas", () => {
    expect(formatearFechaDma("")).toBe("");
    expect(formatearFechaDma(undefined)).toBe("");
    expect(formatearFechaDma("invalido")).toBe("");
  });
});

describe("filasCartera", () => {
  it("genera una fila por cada poliza actual", () => {
    const items: ClienteConPolizas[] = [
      {
        cliente: cliente(),
        polizas: [
          poliza({ id: "p1", numeroPoliza: "POL-1" }),
          poliza({ id: "p2", numeroPoliza: "POL-2" }),
        ],
      },
    ];

    const filas = filasCartera(items, REFERENCIA);
    expect(filas).toHaveLength(2);
    expect(filas[0].numeroPoliza).toBe("POL-1");
    expect(filas[1].numeroPoliza).toBe("POL-2");
    expect(filas[0].cliente).toBe("Juan Perez");
  });

  it("excluye vigencias renovadas (solo exporta polizasActuales)", () => {
    const pVieja = poliza({ id: "p-vieja", numeroPoliza: "POL-100", vigenciaFin: "2026-09-17" });
    const pNueva = poliza({
      id: "p-nueva",
      numeroPoliza: "POL-100",
      vigenciaFin: "2027-09-17",
      polizaAnteriorId: "p-vieja",
    });

    const items: ClienteConPolizas[] = [
      {
        cliente: cliente(),
        polizas: [pVieja, pNueva],
      },
    ];

    const filas = filasCartera(items, REFERENCIA);
    expect(filas).toHaveLength(1);
    expect(filas[0].vigenciaHasta).toBe("17/09/2027");
  });

  it("cliente sin polizas genera 1 fila con columnas de poliza vacias", () => {
    const items: ClienteConPolizas[] = [
      {
        cliente: cliente({ nombre: "Sin Seguro", cedula: "PE-999", telefono: "6222-3333", email: "sin@seguro.com" }),
        polizas: [],
      },
    ];

    const filas = filasCartera(items, REFERENCIA);
    expect(filas).toHaveLength(1);
    expect(filas[0]).toEqual({
      cliente: "Sin Seguro",
      cedula: "PE-999",
      telefono: "6222-3333",
      email: "sin@seguro.com",
      aseguradora: "",
      tipoSeguro: "",
      numeroPoliza: "",
      corredor: "",
      vigenciaDesde: "",
      vigenciaHasta: "",
      diasRestantes: null,
      estado: "",
      prima: null,
      frecuenciaPago: "",
      conductoPago: "",
    });
  });

  it("calcula el estado en los limites: -1 Vencida, 0 y 30 Por vencer, 31 Vigente", () => {
    const items: ClienteConPolizas[] = [
      {
        cliente: cliente(),
        polizas: [
          // REFERENCIA es 2026-09-22
          poliza({ id: "p1", vigenciaFin: "2026-09-21" }), // -1 dia -> Vencida
          poliza({ id: "p2", vigenciaFin: "2026-09-22" }), // 0 dias -> Por vencer
          poliza({ id: "p3", vigenciaFin: "2026-10-22" }), // 30 dias -> Por vencer
          poliza({ id: "p4", vigenciaFin: "2026-10-23" }), // 31 dias -> Vigente
        ],
      },
    ];

    const filas = filasCartera(items, REFERENCIA);
    expect(filas.map((f) => ({ dias: f.diasRestantes, estado: f.estado }))).toEqual([
      { dias: -1, estado: "Vencida" },
      { dias: 0, estado: "Por vencer" },
      { dias: 30, estado: "Por vencer" },
      { dias: 31, estado: "Vigente" },
    ]);
  });

  it("formatea las fechas en dd/mm/aaaa", () => {
    const items: ClienteConPolizas[] = [
      {
        cliente: cliente(),
        polizas: [poliza({ vigenciaInicio: "2026-03-05", vigenciaFin: "2027-03-05" })],
      },
    ];

    const filas = filasCartera(items, REFERENCIA);
    expect(filas[0].vigenciaDesde).toBe("05/03/2026");
    expect(filas[0].vigenciaHasta).toBe("05/03/2027");
  });
});

describe("filasRenovaciones", () => {
  it("trae telefono y email del cliente correspondiente", () => {
    const cl = cliente({ id: "c1", nombre: "Maria Lopez", telefono: "6789-0000", email: "maria@correo.com" });
    const pol = poliza({ id: "p1", clienteId: "c1", vigenciaFin: "2026-09-25" });
    const items: ClienteConPolizas[] = [{ cliente: cl, polizas: [pol] }];

    const renovaciones: ItemRenovacion[] = [
      {
        clienteId: "c1",
        clienteNombre: "Maria Lopez",
        poliza: pol,
        diasRestantes: 3,
      },
    ];

    const filas = filasRenovaciones(renovaciones, items, REFERENCIA);
    expect(filas).toHaveLength(1);
    expect(filas[0].cliente).toBe("Maria Lopez");
    expect(filas[0].telefono).toBe("6789-0000");
    expect(filas[0].email).toBe("maria@correo.com");
    expect(filas[0].diasRestantes).toBe(3);
    expect(filas[0].estado).toBe("Por vencer");
  });
});
