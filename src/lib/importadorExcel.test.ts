import { describe, expect, it } from "vitest";
import { normalizarTexto, parsePrima, parseVigenciaRango, planificarImportacion } from "./importadorExcel.ts";
import type { ClienteAgrupado, PlanImportacion, PolizaValida } from "./importadorExcel.ts";
import type { ClienteConPolizas } from "./clientesRepo.ts";
import type { Poliza } from "./types.ts";

function polizaValida(overrides: Partial<PolizaValida> = {}): PolizaValida {
  return {
    filaNumero: 2,
    clienteNombre: "Cliente",
    aseguradora: "ASSA",
    tipoProductoTexto: "",
    numeroPoliza: "POL-1",
    vigenciaInicio: "2026-01-01",
    vigenciaFin: "2027-01-01",
    prima: 0,
    observaciones: "",
    ...overrides,
  };
}

function poliza(overrides: Partial<Poliza> = {}): Poliza {
  return {
    id: "p1",
    clienteId: "c1",
    aseguradora: "ASSA",
    tipoSeguro: "Otro",
    detalleBien: "",
    numeroPoliza: "POL-1",
    vigenciaInicio: "2026-01-01",
    vigenciaFin: "2027-01-01",
    prima: 0,
    observaciones: "",
    beneficios: "",
    ...overrides,
  };
}

function existente(id: string, nombre: string, polizas: Poliza[] = []): ClienteConPolizas {
  return { cliente: { id, nombre, cedula: "", telefono: "" }, polizas };
}

function existentesDesdePlan(plan: PlanImportacion): ClienteConPolizas[] {
  const porClave = new Map<string, ClienteConPolizas>();
  plan.clientesNuevos.forEach((nombre, i) => {
    porClave.set(normalizarTexto(nombre), existente(`nuevo-${i}`, nombre));
  });
  for (const { claveCliente, poliza: pv } of plan.polizasPorCrear) {
    porClave
      .get(claveCliente)
      ?.polizas.push(
        poliza({
          aseguradora: pv.aseguradora,
          numeroPoliza: pv.numeroPoliza,
          vigenciaInicio: pv.vigenciaInicio,
          vigenciaFin: pv.vigenciaFin,
        }),
      );
  }
  return [...porClave.values()];
}

describe("parsePrima", () => {
  it("interpreta separadores de miles y decimales", () => {
    const casos: [unknown, number][] = [
      ["1,250", 1250],
      ["12,500,000", 12500000],
      ["1,250.50", 1250.5],
      ["1.250,50", 1250.5],
      ["1250,5", 1250.5],
      ["1.250", 1.25],
      ["1.234.567", 1234567],
      ["B/. 1,250.00", 1250],
      ["$ 980", 980],
      [1250, 1250],
      ["", 0],
      ["-5", 0],
      ["abc", 0],
    ];
    for (const [valor, esperado] of casos) {
      expect(parsePrima(valor), `parsePrima(${JSON.stringify(valor)})`).toBe(esperado);
    }
  });
});

describe("parseVigenciaRango", () => {
  it("rechaza fechas imposibles y acepta las válidas", () => {
    expect(parseVigenciaRango("31/02/2026 al 31/03/2026")).toBeNull();
    expect(parseVigenciaRango("29/02/2028 al 28/02/2029")).toEqual({
      vigenciaInicio: "2028-02-29",
      vigenciaFin: "2029-02-28",
    });
    expect(parseVigenciaRango("29/02/2027 al 01/03/2027")).toBeNull();
    expect(parseVigenciaRango("16/9/2026 al 16/09/2027")).toEqual({
      vigenciaInicio: "2026-09-16",
      vigenciaFin: "2027-09-16",
    });
  });
});

describe("normalizarTexto", () => {
  it("colapsa espacios y quita acentos y mayúsculas", () => {
    expect(normalizarTexto("  Juan   PÉREZ  ")).toBe("juan perez");
  });
});

describe("planificarImportacion", () => {
  it("reutiliza un cliente existente por nombre normalizado", () => {
    const grupos: ClienteAgrupado[] = [
      { nombre: "Juan Perez", polizas: [polizaValida({ numeroPoliza: "P-1" })] },
    ];
    const plan = planificarImportacion(grupos, [existente("c1", "juan  perez")]);

    expect(plan.clientesNuevos).toEqual([]);
    expect(plan.omitidas).toEqual([]);
    expect(plan.polizasPorCrear).toHaveLength(1);
    expect(plan.polizasPorCrear[0].clienteIdExistente).toBe("c1");
    expect(plan.polizasPorCrear[0].claveCliente).toBe("juan perez");
  });

  it("fusiona dos grupos con el mismo nombre normalizado en un solo cliente nuevo", () => {
    const grupos: ClienteAgrupado[] = [
      { nombre: "Juan Perez", polizas: [polizaValida({ numeroPoliza: "P-1" })] },
      { nombre: "juan  perez", polizas: [polizaValida({ filaNumero: 3, numeroPoliza: "P-2" })] },
    ];
    const plan = planificarImportacion(grupos, []);

    expect(plan.clientesNuevos).toEqual(["Juan Perez"]);
    expect(plan.polizasPorCrear).toHaveLength(2);
    expect(plan.polizasPorCrear.every((a) => a.claveCliente === "juan perez")).toBe(true);
    expect(plan.polizasPorCrear.every((a) => a.clienteIdExistente === null)).toBe(true);
  });

  it("omite una póliza ya existente ignorando mayúsculas y acentos", () => {
    const grupos: ClienteAgrupado[] = [
      {
        nombre: "Ana",
        polizas: [polizaValida({ aseguradora: "mercantil seguros", numeroPoliza: "ab-1" })],
      },
    ];
    const existentes = [
      existente("c1", "Ana", [poliza({ aseguradora: "Mercantíl Seguros", numeroPoliza: "AB-1" })]),
    ];
    const plan = planificarImportacion(grupos, existentes);

    expect(plan.omitidas).toHaveLength(1);
    expect(plan.polizasPorCrear).toHaveLength(0);
    expect(plan.clientesNuevos).toEqual([]);
  });

  it("omite un duplicado dentro del mismo archivo", () => {
    const grupos: ClienteAgrupado[] = [
      {
        nombre: "Luis",
        polizas: [
          polizaValida({ numeroPoliza: "DUP-1" }),
          polizaValida({ filaNumero: 3, numeroPoliza: "dup-1" }),
        ],
      },
    ];
    const plan = planificarImportacion(grupos, []);

    expect(plan.clientesNuevos).toEqual(["Luis"]);
    expect(plan.polizasPorCrear).toHaveLength(1);
    expect(plan.omitidas).toHaveLength(1);
  });

  it("no crea un cliente nuevo cuyas pólizas quedaron todas omitidas", () => {
    const grupos: ClienteAgrupado[] = [
      { nombre: "Cliente Nuevo", polizas: [polizaValida({ numeroPoliza: "EXIST-1" })] },
    ];
    const existentes = [existente("c9", "Otro", [poliza({ numeroPoliza: "EXIST-1" })])];
    const plan = planificarImportacion(grupos, existentes);

    expect(plan.clientesNuevos).toEqual([]);
    expect(plan.polizasPorCrear).toHaveLength(0);
    expect(plan.omitidas).toHaveLength(1);
  });

  it("es idempotente: re-ejecutar el plan con su resultado como existentes no crea nada", () => {
    const grupos: ClienteAgrupado[] = [
      { nombre: "Juan Perez", polizas: [polizaValida({ numeroPoliza: "P-1" })] },
      { nombre: "Ana", polizas: [polizaValida({ filaNumero: 3, numeroPoliza: "P-2" })] },
    ];
    const plan1 = planificarImportacion(grupos, []);
    expect(plan1.clientesNuevos).toHaveLength(2);
    expect(plan1.polizasPorCrear).toHaveLength(2);

    const plan2 = planificarImportacion(grupos, existentesDesdePlan(plan1));

    expect(plan2.clientesNuevos).toEqual([]);
    expect(plan2.polizasPorCrear).toHaveLength(0);
    expect(plan2.omitidas).toHaveLength(2);
  });

  it("misma póliza con vigencia nueva en cliente existente se crea enlazada a la anterior", () => {
    const existentes = [
      existente("c1", "Carlos Gomez", [
        poliza({
          id: "pol-vieja",
          aseguradora: "ASSA",
          numeroPoliza: "POL-100",
          vigenciaInicio: "2025-01-01",
          vigenciaFin: "2026-01-01",
        }),
      ]),
    ];
    const grupos: ClienteAgrupado[] = [
      {
        nombre: "Carlos Gomez",
        polizas: [
          polizaValida({
            aseguradora: "ASSA",
            numeroPoliza: "POL-100",
            vigenciaInicio: "2026-01-01",
            vigenciaFin: "2027-01-01",
          }),
        ],
      },
    ];
    const plan = planificarImportacion(grupos, existentes);

    expect(plan.omitidas).toHaveLength(0);
    expect(plan.polizasPorCrear).toHaveLength(1);
    expect(plan.polizasPorCrear[0].polizaAnteriorId).toBe("pol-vieja");
    expect(plan.renovacionesEnlazadas).toBe(1);
  });

  it("duplicado exacto (misma aseguradora, número y vigenciaInicio) se omite", () => {
    const existentes = [
      existente("c1", "Carlos Gomez", [
        poliza({
          id: "pol-existente",
          aseguradora: "ASSA",
          numeroPoliza: "POL-100",
          vigenciaInicio: "2026-01-01",
        }),
      ]),
    ];
    const grupos: ClienteAgrupado[] = [
      {
        nombre: "Carlos Gomez",
        polizas: [
          polizaValida({
            aseguradora: "ASSA",
            numeroPoliza: "POL-100",
            vigenciaInicio: "2026-01-01",
          }),
        ],
      },
    ];
    const plan = planificarImportacion(grupos, existentes);

    expect(plan.omitidas).toHaveLength(1);
    expect(plan.polizasPorCrear).toHaveLength(0);
    expect(plan.renovacionesEnlazadas).toBe(0);
  });

  it("dos filas del archivo que reclaman la misma anterior: solo la primera enlaza", () => {
    const existentes = [
      existente("c1", "Carlos Gomez", [
        poliza({
          id: "pol-base",
          aseguradora: "ASSA",
          numeroPoliza: "POL-100",
          vigenciaInicio: "2024-01-01",
        }),
      ]),
    ];
    const grupos: ClienteAgrupado[] = [
      {
        nombre: "Carlos Gomez",
        polizas: [
          polizaValida({
            filaNumero: 2,
            aseguradora: "ASSA",
            numeroPoliza: "POL-100",
            vigenciaInicio: "2025-01-01",
          }),
          polizaValida({
            filaNumero: 3,
            aseguradora: "ASSA",
            numeroPoliza: "POL-100",
            vigenciaInicio: "2026-01-01",
          }),
        ],
      },
    ];
    const plan = planificarImportacion(grupos, existentes);

    expect(plan.polizasPorCrear).toHaveLength(2);
    expect(plan.polizasPorCrear[0].polizaAnteriorId).toBe("pol-base");
    expect(plan.polizasPorCrear[1].polizaAnteriorId).toBeNull();
    expect(plan.renovacionesEnlazadas).toBe(1);
  });

  it("póliza ya renovada (no actual) no se vuelve a enlazar", () => {
    const p1 = poliza({
      id: "p1",
      aseguradora: "ASSA",
      numeroPoliza: "POL-100",
      vigenciaInicio: "2024-01-01",
    });
    const p2 = poliza({
      id: "p2",
      aseguradora: "ASSA",
      numeroPoliza: "POL-100",
      vigenciaInicio: "2025-01-01",
      polizaAnteriorId: "p1",
    });
    const existentes = [existente("c1", "Carlos Gomez", [p1, p2])];

    const grupos: ClienteAgrupado[] = [
      {
        nombre: "Carlos Gomez",
        polizas: [
          polizaValida({
            aseguradora: "ASSA",
            numeroPoliza: "POL-100",
            vigenciaInicio: "2026-01-01",
          }),
        ],
      },
    ];
    const plan = planificarImportacion(grupos, existentes);

    expect(plan.polizasPorCrear).toHaveLength(1);
    expect(plan.polizasPorCrear[0].polizaAnteriorId).toBe("p2");
    expect(plan.polizasPorCrear[0].polizaAnteriorId).not.toBe("p1");
    expect(plan.renovacionesEnlazadas).toBe(1);
  });

  it("cliente nuevo nunca enlaza", () => {
    const existentes = [
      existente("c1", "Cliente Existente", [
        poliza({
          id: "p1",
          aseguradora: "ASSA",
          numeroPoliza: "POL-100",
          vigenciaInicio: "2025-01-01",
        }),
      ]),
    ];
    const grupos: ClienteAgrupado[] = [
      {
        nombre: "Cliente Nuevo Desconocido",
        polizas: [
          polizaValida({
            aseguradora: "ASSA",
            numeroPoliza: "POL-100",
            vigenciaInicio: "2026-01-01",
          }),
        ],
      },
    ];
    const plan = planificarImportacion(grupos, existentes);

    expect(plan.clientesNuevos).toEqual(["Cliente Nuevo Desconocido"]);
    expect(plan.polizasPorCrear).toHaveLength(1);
    expect(plan.polizasPorCrear[0].polizaAnteriorId).toBeNull();
    expect(plan.renovacionesEnlazadas).toBe(0);
  });

  it("misma póliza en otro cliente no enlaza", () => {
    const existentes = [
      existente("c1", "Cliente A", [
        poliza({
          id: "p-cliente-a",
          aseguradora: "ASSA",
          numeroPoliza: "POL-COMPARTIDA",
          vigenciaInicio: "2025-01-01",
        }),
      ]),
      existente("c2", "Cliente B", []),
    ];
    const grupos: ClienteAgrupado[] = [
      {
        nombre: "Cliente B",
        polizas: [
          polizaValida({
            aseguradora: "ASSA",
            numeroPoliza: "POL-COMPARTIDA",
            vigenciaInicio: "2026-01-01",
          }),
        ],
      },
    ];
    const plan = planificarImportacion(grupos, existentes);

    expect(plan.polizasPorCrear).toHaveLength(1);
    expect(plan.polizasPorCrear[0].polizaAnteriorId).toBeNull();
    expect(plan.renovacionesEnlazadas).toBe(0);
  });
});
