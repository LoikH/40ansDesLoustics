import { z } from "zod";

export const rsvpSchema = z.object({
  code: z.string().min(3),
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  attending: z.boolean(),
  adultPartner: z.boolean(),
  children: z.object({
    count: z.number().int().min(0).max(10),
    ageRanges: z.object({
      "0-3": z.number().int().min(0),
      "4-10": z.number().int().min(0),
      "11-17": z.number().int().min(0),
    }),
  }),
  message: z.string().max(500).optional().or(z.literal("")),
});
