import { z } from "zod";

export const updateSettingsSchema = z.object({
  whatsappNumber: z
    .string()
    .trim()
    .min(7, "WhatsApp number must be at least 7 characters")
    .max(25, "WhatsApp number cannot exceed 25 characters")
    .regex(/^\+?[0-9\s-]+$/, "Invalid WhatsApp phone number format")
    .optional(),
  companyName: z
    .string()
    .trim()
    .min(2, "Company name must be at least 2 characters")
    .max(150, "Company name cannot exceed 150 characters")
    .optional(),
  companyEmail: z
    .string()
    .trim()
    .email("Must be a valid email address")
    .max(120, "Email cannot exceed 120 characters")
    .optional()
    .nullable(),
  companyPhone: z
    .string()
    .trim()
    .max(30, "Phone number cannot exceed 30 characters")
    .optional()
    .nullable(),
  companyAddress: z
    .string()
    .trim()
    .max(250, "Address cannot exceed 250 characters")
    .optional()
    .nullable(),
  quoteDisclaimer: z
    .string()
    .trim()
    .max(1000, "Disclaimer cannot exceed 1000 characters")
    .optional()
    .nullable(),
});

