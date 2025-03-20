import { z } from "zod";
import { eventCreationSchema, eventSchema } from "./event";

export const productSchema = z.object({
  id: z.string(),
  name: z.string().min(3, "Le nom du produit est requis"),
  category: z.object({
    id: z.string(),
    name: z.string()
  }),
  events: z.array(eventSchema)
});

export type Product = z.infer<typeof productSchema>;

export const productCreateSchema = z.object({
  name: z.string().min(3, "Le nom du produit est requis"),
  category: z.string().uuid("La catégorie est requise"),
  events: z.array(eventCreationSchema)
});

export type ProductCreate = z.infer<typeof productCreateSchema>;