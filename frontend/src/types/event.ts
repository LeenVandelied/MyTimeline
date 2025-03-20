import { z } from "zod";

export const eventSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string(),
  durationValue: z.number().optional(),
  durationUnit: z.enum(["days", "weeks", "months", "years"]).optional(),
  isRecurring: z.boolean().optional(),
  recurrenceUnit: z.enum(["weeks", "months", "years"]).optional(),
  startDate: z.string(),
  endDate: z.string(),
  productId: z.string(),
  allDay: z.boolean(),
  backgroundColor: z.string().optional(),
  borderColor: z.string().optional(),
  textColor: z.string().optional(),
});

export type Event = z.infer<typeof eventSchema>;

export const eventCreationSchema = z.object({
  name: z.string().min(3, "Le nom de l'événement est requis"),
  type: z.enum(["duration", "single"]),
  date: z.date().optional(),
  durationValue: z.number().optional(),
  durationUnit: z.enum(["days", "weeks", "months", "years"]).optional(),
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

export type EventCreate = z.infer<typeof eventCreationSchema>;

export type FullCalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  resourceId: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps: {
    productId: string;
    productName: string;
    category: string;
  };
};

export const mapToFullCalendarEvent = (event: Event, productName: string, category: string, productId: string): FullCalendarEvent => ({
  id: event.id,
  title: event.title,
  start: event.startDate,
  end: event.endDate,
  allDay: event.allDay,
  resourceId: productId,
  backgroundColor: event.backgroundColor,
  borderColor: event.borderColor,
  textColor: event.textColor,
  extendedProps: {
    productId: event.productId,
    productName,
    category
  }
});