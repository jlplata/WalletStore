import { z } from "zod";

export const rewardSchema = z.object({
  programId: z.string().uuid("Selecciona un programa."),
  name: z.string().min(2, "Ingresa el nombre de la recompensa.").max(120),
  description: z.string().max(300).optional().or(z.literal("")),
  type: z.enum(["FREE_ITEM", "DISCOUNT_FIXED", "DISCOUNT_PERCENTAGE", "CUSTOM"]),
  costStamps: z.coerce.number().int().min(1).optional(),
  costPoints: z.coerce.number().min(1).optional(),
  discountAmountCents: z.coerce.number().int().min(0).optional(),
  discountPercentage: z.coerce.number().min(0).max(100).optional(),
  perCustomerLimit: z.coerce.number().int().min(1).optional(),
});
