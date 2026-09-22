import { z } from "zod";

export const BUSINESS_CATEGORIES = [
  "Cafetería",
  "Restaurante",
  "Barbería",
  "Estética / Spa",
  "Gimnasio",
  "Autolavado",
  "Tienda",
  "Otro",
] as const;

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export { slugify };

export const businessInfoSchema = z.object({
  name: z.string().min(2, "Ingresa el nombre de tu negocio.").max(120),
  legalName: z.string().max(160).optional().or(z.literal("")),
  category: z.enum(BUSINESS_CATEGORIES),
  country: z.string().default("MX"),
  currency: z.string().default("MXN"),
  timezone: z.string().default("America/Mexico_City"),
  phone: z.string().max(30).optional().or(z.literal("")),
  email: z.string().email("Correo inválido.").optional().or(z.literal("")),
  website: z.string().url("URL inválida.").optional().or(z.literal("")),
});

export const brandingSchema = z.object({
  brandPrimaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Usa un color hexadecimal, ej. #171717"),
  brandSecondaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Usa un color hexadecimal, ej. #ffffff"),
  logoUrl: z.string().url().optional().or(z.literal("")),
  bannerUrl: z.string().url().optional().or(z.literal("")),
});

export const branchSchema = z.object({
  name: z.string().min(2, "Ingresa el nombre de la sucursal.").max(120),
  address: z.string().max(300).optional().or(z.literal("")),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  phone: z.string().max(30).optional().or(z.literal("")),
});

export const programSchema = z
  .object({
    name: z.string().min(2, "Ingresa el nombre del programa.").max(120),
    type: z.enum(["STAMPS", "POINTS"]),
    rewardHeadline: z.string().min(2, "Describe la recompensa principal.").max(160),
    // STAMPS
    stampsRequired: z.coerce.number().int().min(1).max(100).optional(),
    stampsPerPurchase: z.coerce.number().int().min(1).max(20).optional(),
    minPurchaseAmountCents: z.coerce.number().int().min(0).optional(),
    // POINTS
    pointsPerCurrencyUnit: z.coerce.number().min(0.01).optional(),
    currencyUnitCents: z.coerce.number().int().min(1).optional(),
    pointsCostForReward: z.coerce.number().min(1).optional(),
  })
  .refine(
    (data) =>
      data.type === "STAMPS"
        ? !!data.stampsRequired
        : !!data.pointsPerCurrencyUnit && !!data.pointsCostForReward,
    { message: "Completa las reglas del programa.", path: ["type"] }
  );
