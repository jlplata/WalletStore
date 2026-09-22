import { describe, it, expect } from "vitest";
import { slugify, businessInfoSchema, programSchema } from "@/lib/validations/onboarding";
import { customerRegistrationSchema } from "@/lib/validations/customer";
import { rewardSchema } from "@/lib/validations/reward";

describe("slugify", () => {
  it("lowercases, strips accents and replaces spaces with dashes", () => {
    expect(slugify("Café Demo Ñoño")).toBe("cafe-demo-nono");
  });

  it("strips leading/trailing dashes and repeated separators", () => {
    expect(slugify("  --Hello   World!! --")).toBe("hello-world");
  });

  it("truncates to 60 characters", () => {
    const long = "a".repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(60);
  });
});

describe("businessInfoSchema", () => {
  it("accepts a minimal valid business", () => {
    const result = businessInfoSchema.safeParse({ name: "Café Demo", category: "Cafetería" });
    expect(result.success).toBe(true);
  });

  it("rejects a name that is too short", () => {
    const result = businessInfoSchema.safeParse({ name: "A", category: "Cafetería" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid category", () => {
    const result = businessInfoSchema.safeParse({ name: "Café Demo", category: "Not a category" });
    expect(result.success).toBe(false);
  });
});

describe("programSchema", () => {
  it("requires stampsRequired for STAMPS programs", () => {
    const result = programSchema.safeParse({
      name: "Café Club",
      type: "STAMPS",
      rewardHeadline: "Café gratis",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid STAMPS program", () => {
    const result = programSchema.safeParse({
      name: "Café Club",
      type: "STAMPS",
      rewardHeadline: "Café gratis",
      stampsRequired: 10,
    });
    expect(result.success).toBe(true);
  });

  it("requires pointsPerCurrencyUnit and pointsCostForReward for POINTS programs", () => {
    const result = programSchema.safeParse({
      name: "Puntos Club",
      type: "POINTS",
      rewardHeadline: "10% de descuento",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid POINTS program", () => {
    const result = programSchema.safeParse({
      name: "Puntos Club",
      type: "POINTS",
      rewardHeadline: "10% de descuento",
      pointsPerCurrencyUnit: 1,
      pointsCostForReward: 100,
    });
    expect(result.success).toBe(true);
  });
});

describe("customerRegistrationSchema", () => {
  it("requires accepting terms", () => {
    const result = customerRegistrationSchema.safeParse({
      firstName: "María",
      phone: "5512345678",
      termsAccepted: false,
    });
    expect(result.success).toBe(false);
  });

  it("requires a phone or an email", () => {
    const result = customerRegistrationSchema.safeParse({
      firstName: "María",
      termsAccepted: true,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid registration with only a phone", () => {
    const result = customerRegistrationSchema.safeParse({
      firstName: "María",
      phone: "5512345678",
      termsAccepted: true,
    });
    expect(result.success).toBe(true);
  });

  it("defaults marketingConsent to false when omitted", () => {
    const result = customerRegistrationSchema.safeParse({
      firstName: "María",
      phone: "5512345678",
      termsAccepted: true,
    });
    if (result.success) {
      expect(result.data.marketingConsent).toBe(false);
    } else {
      throw new Error("expected success");
    }
  });
});

describe("rewardSchema", () => {
  it("requires a valid programId", () => {
    const result = rewardSchema.safeParse({
      programId: "not-a-uuid",
      name: "Café gratis",
      type: "FREE_ITEM",
      costStamps: 10,
    });
    expect(result.success).toBe(false);
  });
});
