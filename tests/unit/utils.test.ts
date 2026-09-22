import { describe, it, expect } from "vitest";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

describe("cn", () => {
  it("merges conditional classes and dedupes conflicting Tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-sm", false && "text-lg", "font-bold")).toBe("text-sm font-bold");
  });
});

describe("formatCurrency", () => {
  it("formats cents as MXN by default", () => {
    expect(formatCurrency(150000)).toBe("$1,500.00");
  });

  it("supports other currencies", () => {
    const usd = formatCurrency(999, "USD");
    expect(usd).toContain("9.99");
  });

  it("formats zero correctly", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });
});

describe("formatDate", () => {
  it("formats an ISO string as dd/mm/yyyy", () => {
    expect(formatDate("2026-03-05T12:00:00.000Z")).toBe("05/03/2026");
  });

  it("accepts a Date instance", () => {
    expect(formatDate(new Date("2026-12-25T00:00:00.000Z"))).toBe("25/12/2026");
  });
});
