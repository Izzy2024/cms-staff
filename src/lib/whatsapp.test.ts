import { describe, expect, it } from "vitest";
import { enlaceWhatsApp, mensajeCumpleanos, mensajeRenovacion } from "./whatsapp.ts";
import type { Poliza } from "./types.ts";

function polizaEjemplo(overrides: Partial<Poliza> = {}): Poliza {
  return {
    id: "p-test",
    clienteId: "c-test",
    aseguradora: "ASSA",
    tipoSeguro: "Auto",
    detalleBien: "Toyota Corolla 2022",
    numeroPoliza: "POL-9999",
    vigenciaInicio: "2025-10-15",
    vigenciaFin: "2026-10-15",
    prima: 450,
    observaciones: "",
    beneficios: "",
    ...overrides,
  };
}

describe("enlaceWhatsApp", () => {
  it("formato 8 dígitos Panamá antepone 507", () => {
    const enlace = enlaceWhatsApp("6682-1234", "Hola");
    expect(enlace).toBe("https://wa.me/50766821234?text=Hola");
  });

  it("formato con +507 y más de 8 dígitos preserva el código de país sin duplicar", () => {
    const enlace = enlaceWhatsApp("+507 6682 1234", "Hola");
    expect(enlace).toBe("https://wa.me/50766821234?text=Hola");
  });

  it("teléfono fijo de 7 dígitos antepone 507", () => {
    const enlace = enlaceWhatsApp("205-6789", "Hola");
    expect(enlace).toBe("https://wa.me/5072056789?text=Hola");
  });

  it("retorna null para undefined, vacío o sin dígitos", () => {
    expect(enlaceWhatsApp(undefined, "Hola")).toBeNull();
    expect(enlaceWhatsApp("", "Hola")).toBeNull();
    expect(enlaceWhatsApp("   ", "Hola")).toBeNull();
    expect(enlaceWhatsApp("abc-xyz", "Hola")).toBeNull();
  });

  it("codifica el texto con encodeURIComponent respetando acentos, espacios y ¿", () => {
    const enlace = enlaceWhatsApp("6682-1234", "¡Hola! ¿Cómo estás?");
    expect(enlace).toBe(
      "https://wa.me/50766821234?text=%C2%A1Hola!%20%C2%BFC%C3%B3mo%20est%C3%A1s%3F",
    );
  });
});

describe("mensajeRenovacion", () => {
  it("usa 'vence el' si diasRestantes >= 0 y fecha en dd/mm/aaaa", () => {
    const poliza = polizaEjemplo({
      tipoSeguro: "Auto",
      numeroPoliza: "POL-1234",
      aseguradora: "ASSA",
      vigenciaFin: "2026-10-15",
    });
    const msg = mensajeRenovacion("Juan Carlos Pérez", poliza, 10);
    expect(msg).toBe(
      "Hola Juan, le saluda su corredor de seguros. Su póliza de Auto N° POL-1234 con ASSA vence el 15/10/2026. ¿Le ayudo con la renovación?",
    );
  });

  it("usa 'venció el' si diasRestantes < 0", () => {
    const poliza = polizaEjemplo({
      tipoSeguro: "Salud",
      numeroPoliza: "SAL-555",
      aseguradora: "SURA",
      vigenciaFin: "2026-09-01",
    });
    const msg = mensajeRenovacion("María Elena Sánchez", poliza, -5);
    expect(msg).toBe(
      "Hola María, le saluda su corredor de seguros. Su póliza de Salud N° SAL-555 con SURA venció el 01/09/2026. ¿Le ayudo con la renovación?",
    );
  });

  it("primer nombre de un solo nombre o con espacios iniciales", () => {
    const poliza = polizaEjemplo();
    const msg = mensajeRenovacion("   Carlos   ", poliza, 5);
    expect(msg).toContain("Hola Carlos,");
  });
});

describe("mensajeCumpleanos", () => {
  it("extrae el primer nombre de 'Juan Carlos Pérez'", () => {
    const msg = mensajeCumpleanos("Juan Carlos Pérez");
    expect(msg).toBe(
      "¡Feliz cumpleaños, Juan! Le deseo un excelente día. Saludos de su corredor de seguros.",
    );
  });

  it("saluda correctamente a una persona con un solo nombre", () => {
    const msg = mensajeCumpleanos("Ana");
    expect(msg).toBe(
      "¡Feliz cumpleaños, Ana! Le deseo un excelente día. Saludos de su corredor de seguros.",
    );
  });
});
