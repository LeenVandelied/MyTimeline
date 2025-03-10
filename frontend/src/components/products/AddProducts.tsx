"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Form, FormField, FormItem, FormMessage, FormControl } from "@/components/ui/form";
import apiClient from "@/services/apiClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

const eventSchema = z.object({
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

const productSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères"),
  category: z.string().min(1, "Veuillez choisir une catégorie"),
  events: z.array(eventSchema),
});

type ProductFormValues = z.infer<typeof productSchema>;
type EventFormValues = z.infer<typeof eventSchema>;

export default function AddProduct() {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<EventFormValues[]>([]);

  const productForm = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      category: "",
      events: [],
    },
  });

  const eventForm = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: "",
      type: "single",
      durationValue: undefined,
      durationUnit: undefined,
      date: undefined,
      isRecurring: false,
      recurrenceUnit: undefined,
    },
  });

  const onSubmitProduct = async (data: ProductFormValues) => {
    try {
      const finalData = { ...data, events };
      await apiClient.post("/api/products", finalData);
      
      setOpen(false);
      setEvents([]);
      productForm.reset();
    } catch (error) {
      console.error("Erreur lors de l'ajout du produit", error);
    }
  };
  const onSubmitEvent = (data: EventFormValues) => {
    setEvents((prev) => [...prev, data]);
  
    eventForm.reset({
      name: "",
      type: "single",
      durationValue: undefined,
      durationUnit: undefined,
      date: undefined,
      isRecurring: false,
      recurrenceUnit: undefined,
    });
  };

  const removeEvent = (index: number) => {
    setEvents((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Ajouter un produit</Button>
      </DialogTrigger>
      <DialogContent className="p-6 bg-gray-900 border border-gray-700 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-semibold">Ajouter un produit</DialogTitle>
        </DialogHeader>

        <Form {...productForm}>
          <form onSubmit={productForm.handleSubmit(onSubmitProduct)}>
            <FormField control={productForm.control} name="name"
              render={({ field }) => (
                <FormItem>
                  <Label>Nom du produit</Label>
                  <FormControl>
                    <Input placeholder="Nom du produit" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField control={productForm.control} name="category"
              render={({ field }) => (
                <FormItem>
                  <Label>Catégorie</Label>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez une catégorie" />
                      </SelectTrigger>
                      <SelectContent className="text-gray-300 bg-gray-900">
                        <SelectItem className="hover:text-white hover:bg-gray-700" value="vehicles">Véhicules</SelectItem>
                        <SelectItem className="hover:text-white hover:bg-gray-700" value="insurance">Assurance</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="mt-6 p-4 border border-gray-700 rounded-md">
              <h3 className="text-lg font-semibold mb-4">Ajouter un événement</h3>
              <Form {...eventForm}>
                <form onSubmit={eventForm.handleSubmit(onSubmitEvent)}>
                  <FormField control={eventForm.control} name="name"
                    render={({ field }) => (
                      <FormItem>
                        <Label>Nom de l&apos;événement</Label>
                        <FormControl>
                          <Input placeholder="Nom de l'événement" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField control={eventForm.control} name="type"
                    render={({ field }) => (
                      <FormItem>
                        <Label>Type</Label>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir le type" />
                            </SelectTrigger>
                            <SelectContent className="text-gray-300 bg-gray-900">
                              <SelectItem className="hover:text-white hover:bg-gray-700" value="duration">Durée</SelectItem>
                              <SelectItem className="hover:text-white hover:bg-gray-700" value="single">Ponctuel</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {eventForm.watch("type") === "duration" && (
                    <>
                      <FormField control={eventForm.control} name="durationValue"
                        render={({ field }) => (
                          <FormItem>
                            <Label>Durée</Label>
                            <FormControl>
                              <Input type="number" placeholder="Valeur" {...field}
                              onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField control={eventForm.control} name="durationUnit"
                        render={({ field }) => (
                          <FormItem>
                            <Label>Unité</Label>
                            <FormControl>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choisir une unité" />
                                </SelectTrigger>
                                <SelectContent className="text-gray-300 bg-gray-900">
                                  <SelectItem className="hover:text-white hover:bg-gray-700" value="days">Jours</SelectItem>
                                  <SelectItem className="hover:text-white hover:bg-gray-700" value="weeks">Semaines</SelectItem>
                                  <SelectItem className="hover:text-white hover:bg-gray-700" value="months">Mois</SelectItem>
                                  <SelectItem className="hover:text-white hover:bg-gray-700" value="years">Années</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  {eventForm.watch("type") === "single" && (
                    <>
                      <FormField control={eventForm.control} name="date"
                        render={({ field }) => (
                          <FormItem>
                            <Label>Date de l&apos;événement</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="ms-3 bg-slate-800">
                                  {field.value ? field.value.toDateString() : "Sélectionner une date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent>
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} className="bg-gray-900 border-none" />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField control={eventForm.control} name="isRecurring"
                        render={({ field }) => (
                          <FormItem className="mt-2 flex items-center gap-2">
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            <Label>Récurrence</Label>
                          </FormItem>
                        )}
                      />

                      {eventForm.watch("isRecurring") && (
                        <FormField control={eventForm.control} name="recurrenceUnit"
                          render={({ field }) => (
                            <FormItem>
                              <Label>Fréquence de récurrence</Label>
                              <FormControl>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Choisir la fréquence" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-gray-900">
                                    <SelectItem className="hover:text-white hover:bg-gray-700" value="weeks">Hebdomadaire</SelectItem>
                                    <SelectItem className="hover:text-white hover:bg-gray-700" value="months">Mensuel</SelectItem>
                                    <SelectItem className="hover:text-white hover:bg-gray-700" value="years">Annuel</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </>
                  )}
                  <Button
                    type="button"
                    className="w-full mt-4 bg-blue-600"
                    onClick={(e) => {
                      e.preventDefault();
                      eventForm.handleSubmit(onSubmitEvent)();
                    }}
                  >
                    Ajouter l&apos;événement
                  </Button>
                </form>
              </Form>
            </div>

            <div className="mt-4">
              {events.map((event, index) => (
                <div key={index} className="p-3 border border-gray-700 mt-2 rounded-md flex justify-between">
                  {event.durationValue && (
                    <span>{event.name} ( {event.durationValue} {event.durationUnit} )</span>
                  )}
                  {event.type === "single" && (
                    <span>{event.name} ( {event.recurrenceUnit} )</span>
                  )}
                  <Button variant="destructive" onClick={() => removeEvent(index)}>Supprimer</Button>
                </div>
              ))}
            </div>

            <Button type="submit" className="w-full bg-blue-600 mt-4">
              Ajouter mon produit
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}