import { z } from "zod";
import { QUOTE_STATUS, PRIORITY } from "../../constants/roles.js";

const quoteItemInputSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1").max(10000, "Quantity exceeds limit").default(1),
  customRequirement: z.string().trim().max(300, "Custom requirement cannot exceed 300 characters").optional(),
});

export const submitQuoteSchema = z.object({
  customerName: z.string().min(2, "Your full name is required").max(100, "Name cannot exceed 100 characters").trim(),
  customerPhone: z.string().min(7, "A valid WhatsApp phone number is required").max(25, "Phone number cannot exceed 25 characters").trim(),
  customerEmail: z.string().email("Invalid email address").max(120, "Email cannot exceed 120 characters").trim().optional().or(z.literal("")),
  hospitalClinic: z.string().max(150, "Hospital name cannot exceed 150 characters").trim().optional().or(z.literal("")),
  location: z.string().max(100, "Location cannot exceed 100 characters").trim().optional().or(z.literal("")),
  priority: z.enum([PRIORITY.STANDARD, PRIORITY.URGENT]).default(PRIORITY.STANDARD),
  customerNotes: z.string().max(1000, "Notes cannot exceed 1000 characters").trim().optional(),
  items: z.array(quoteItemInputSchema).min(1, "At least one surgical product must be selected for quotation").max(50, "A quote cannot contain more than 50 distinct items"),
});

export const updateQuoteStatusSchema = z.object({
  status: z.enum([
    QUOTE_STATUS.NEW,
    QUOTE_STATUS.CONTACTED,
    QUOTE_STATUS.QUOTED,
    QUOTE_STATUS.FULFILLED,
    QUOTE_STATUS.CANCELLED,
  ]),
  adminNotes: z.string().max(1000, "Admin notes cannot exceed 1000 characters").optional(),
});

export const assignQuoteSchema = z.object({
  assignedToId: z.string().uuid("Invalid manager ID"),
});

export const listQuotesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().max(30).optional(),
  priority: z.string().max(30).optional(),
  search: z.string().trim().max(100, "Search query cannot exceed 100 characters").optional(),
});
