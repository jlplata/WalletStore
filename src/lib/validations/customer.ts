import { z } from "zod";

export const customerRegistrationSchema = z
  .object({
    firstName: z.string().min(1, "Ingresa tu nombre.").max(80),
    lastName: z.string().max(80).optional().or(z.literal("")),
    phone: z.string().max(30).optional().or(z.literal("")),
    email: z.string().email("Correo inválido.").max(160).optional().or(z.literal("")),
    birthdate: z.string().optional().or(z.literal("")),
    marketingConsent: z.boolean().default(false),
    termsAccepted: z.literal(true, {
      error: "Debes aceptar los términos y el aviso de privacidad.",
    }),
  })
  .refine((data) => !!data.phone || !!data.email, {
    message: "Ingresa tu teléfono o correo.",
    path: ["phone"],
  });
