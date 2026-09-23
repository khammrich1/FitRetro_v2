import { describe, expect, it } from "vitest";
import { computeDrawVolumeMl, mlToSyringeUnits } from "./reconstitution";

describe("computeDrawVolumeMl", () => {
  it("computes draw volume for a 10mg vial mixed with 2mL, dosed in mcg", () => {
    // 10mg in 2mL = 5000mcg/mL. A 500mcg dose needs 0.1mL.
    const ml = computeDrawVolumeMl({
      vialAmountMg: 10,
      bacWaterMl: 2,
      doseAmount: 500,
      doseUnit: "mcg",
    });
    expect(ml).toBeCloseTo(0.1);
  });

  it("computes draw volume when the dose is itself in mg", () => {
    // 10mg in 2mL = 5mg/mL. A 5mg dose needs 1mL.
    const ml = computeDrawVolumeMl({
      vialAmountMg: 10,
      bacWaterMl: 2,
      doseAmount: 5,
      doseUnit: "mg",
    });
    expect(ml).toBeCloseTo(1);
  });

  it("returns null when reconstitution inputs are missing", () => {
    expect(
      computeDrawVolumeMl({ vialAmountMg: null, bacWaterMl: 2, doseAmount: 5, doseUnit: "mg" }),
    ).toBeNull();
    expect(
      computeDrawVolumeMl({ vialAmountMg: 10, bacWaterMl: null, doseAmount: 5, doseUnit: "mg" }),
    ).toBeNull();
  });

  it("returns null for non-mass dose units (iu/ml)", () => {
    expect(
      computeDrawVolumeMl({ vialAmountMg: 10, bacWaterMl: 2, doseAmount: 5, doseUnit: "iu" }),
    ).toBeNull();
    expect(
      computeDrawVolumeMl({ vialAmountMg: 10, bacWaterMl: 2, doseAmount: 5, doseUnit: "ml" }),
    ).toBeNull();
  });
});

describe("mlToSyringeUnits", () => {
  it("converts mL to U-100 syringe units", () => {
    expect(mlToSyringeUnits(0.5)).toBe(50);
    expect(mlToSyringeUnits(1)).toBe(100);
  });
});
