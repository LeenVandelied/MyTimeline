import { z } from "zod";

export const eventSchema = z.object({
  name: z.string().min(3, "Le nom de l'événement est requis"),
  type: z.enum(["duration", "single"]),
  durationValue: z.number().optional(),
  durationUnit: z.enum(["days", "weeks", "months", "years"]).optional(),
  date: z.date().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceUnit: z.enum(["weeks", "months", "years"]).optional(),
}).superRefine((data, ctx) => {
  if (data.type === "duration" && (!data.durationValue || data.durationValue <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La durée doit être supérieure à 0",
      path: ["durationValue"],
    });
  }
});

export const productSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères"),
  category: z.string().min(1, "Veuillez choisir une catégorie"),
  events: z.array(eventSchema),
});


export type ProductCreate = z.infer<typeof productSchema>;
export type EventCreate = z.infer<typeof eventSchema>;