import { describe, expect, it } from "vitest";
import { calcularCuotas, formatearCuotasTexto } from "./PolizaForm.tsx";

describe("calcularCuotas", () => {
  it("1000 en 3 cuotas -> [333.33, 333.33, 333.34] y la suma es 1000", () => {
    const cuotas = calcularCuotas(1000, 3);
    expect(cuotas).toEqual([333.33, 333.33, 333.34]);
    expect(Math.round(cuotas.reduce((a, b) => a + b, 0) * 100) / 100).toBe(1000);
  });

  it("1200 en 12 cuotas -> 12 cuotas de 100", () => {
    expect(calcularCuotas(1200, 12)).toEqual(Array(12).fill(100));
  });

  it("500 en 1 cuota -> [500]", () => {
    expect(calcularCuotas(500, 1)).toEqual([500]);
  });

  it("cuotas 0 o NaN se trata como 1", () => {
    expect(calcularCuotas(500, 0)).toEqual([500]);
    expect(calcularCuotas(500, NaN)).toEqual([500]);
  });

  it("prima negativa -> [0]", () => {
    expect(calcularCuotas(-100, 1)).toEqual([0]);
  });
});

describe("formatearCuotasTexto", () => {
  it("todas iguales -> 12 cuotas de $100.00", () => {
    expect(formatearCuotasTexto(Array(12).fill(100))).toBe("12 cuotas de $100.00");
  });

  it("distintas -> 2 cuotas de $333.33 y 1 cuota de $333.34", () => {
    expect(formatearCuotasTexto([333.33, 333.33, 333.34])).toBe(
      "2 cuotas de $333.33 y 1 cuota de $333.34",
    );
  });

  it("[] -> $0.00", () => {
    expect(formatearCuotasTexto([])).toBe("$0.00");
  });
});
