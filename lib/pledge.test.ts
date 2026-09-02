import { describe, expect, it } from "vitest";

import { validatePledge } from "./pledge";

const valid = {
  amountChf: 100,
  firstName: "Ada",
  lastName: "Lovelace",
  email: "Ada@Example.com",
  phone: "+41 79 123 45 67",
};

describe("validatePledge", () => {
  it("accepts and normalizes a valid pledge", () => {
    const res = validatePledge(valid);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.amountChf).toBe(100);
      expect(res.value.email).toBe("ada@example.com"); // lowercased
      expect(res.value.firstName).toBe("Ada");
    }
  });

  it("coerces a numeric string amount", () => {
    const res = validatePledge({ ...valid, amountChf: "250" });
    expect(res.ok && res.value.amountChf).toBe(250);
  });

  it("rejects a non-positive amount", () => {
    const res = validatePledge({ ...valid, amountChf: 0 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.amountChf).toBeTruthy();
  });

  it("rejects an absurdly large amount", () => {
    const res = validatePledge({ ...valid, amountChf: 5_000_000 });
    expect(res.ok).toBe(false);
  });

  it("rejects a bad email", () => {
    const res = validatePledge({ ...valid, email: "not-an-email" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.email).toBeTruthy();
  });

  it("rejects a bad phone number", () => {
    const res = validatePledge({ ...valid, phone: "abc" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.phone).toBeTruthy();
  });

  it("requires first and last name", () => {
    const res = validatePledge({ ...valid, firstName: "  ", lastName: "" });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.errors.firstName).toBeTruthy();
      expect(res.errors.lastName).toBeTruthy();
    }
  });

  it("handles missing / null payloads", () => {
    expect(validatePledge(null).ok).toBe(false);
    expect(validatePledge(undefined).ok).toBe(false);
    expect(validatePledge({}).ok).toBe(false);
  });
});
