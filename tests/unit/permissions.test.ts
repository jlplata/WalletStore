import { describe, it, expect } from "vitest";
import { PERMISSIONS } from "@/lib/authz/permissions";

describe("PERMISSIONS matrix", () => {
  it("never grants CASHIER access to program or billing management", () => {
    expect(PERMISSIONS["program.manage"]).not.toContain("CASHIER");
    expect(PERMISSIONS["organization.billing.manage"]).not.toContain("CASHIER");
    expect(PERMISSIONS["customer.export"]).not.toContain("CASHIER");
  });

  it("lets a CASHIER record purchases and redeem rewards", () => {
    expect(PERMISSIONS["purchase.record"]).toContain("CASHIER");
    expect(PERMISSIONS["reward.redeem"]).toContain("CASHIER");
  });

  it("restricts billing management to the owner only", () => {
    expect(PERMISSIONS["organization.billing.manage"]).toEqual(["ORGANIZATION_OWNER"]);
  });

  it("every action grants access to at least the owner", () => {
    for (const roles of Object.values(PERMISSIONS)) {
      expect(roles).toContain("ORGANIZATION_OWNER");
    }
  });
});
