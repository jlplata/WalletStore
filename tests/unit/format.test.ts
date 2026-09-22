import { describe, it, expect } from "vitest";
import { maskPhone, maskEmail } from "@/lib/format";

describe("maskPhone", () => {
  it("keeps only the last 4 digits visible", () => {
    expect(maskPhone("5512345678")).toBe("••• ••• 5678");
  });

  it("returns a placeholder for null", () => {
    expect(maskPhone(null)).toBe("—");
  });

  it("masks very short numbers entirely", () => {
    expect(maskPhone("123")).toBe("••••");
  });
});

describe("maskEmail", () => {
  it("keeps the first two characters and the domain", () => {
    expect(maskEmail("maria@example.com")).toBe("ma•••@example.com");
  });

  it("returns a placeholder for null", () => {
    expect(maskEmail(null)).toBe("—");
  });

  it("handles addresses with no domain gracefully", () => {
    expect(maskEmail("notanemail")).toBe("••••");
  });
});
