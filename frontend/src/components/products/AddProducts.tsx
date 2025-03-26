"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Form, FormField, FormItem, FormMessage, FormControl } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { createProduct } from "@/services/productService";
import { ProductCreate, productCreateSchema } from "@/types/product";
import { EventCreate, eventCreationSchema } from "@/types/event";
import { useAuth } from "@/hooks/useAuth";

interface AddProductProps {
  onProductAdded?: () => void;
}

export default function AddProduct({ onProductAdded }: AddProductProps) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<EventCreate[]>([]);
  const { user } = useAuth();

  const productForm = useForm<ProductCreate>({
    resolver: zodResolver(productCreateSchema),
    defaultValues: {
      name: "",
      category: "",
      events: [],
    },
  });

  const eventForm = useForm<EventCreate>({
    resolver: zodResolver(eventCreationSchema),
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

  const onSubmitProduct = async (data: ProductCreate) => {
    try {
      const finalData: ProductCreate = { ...data, events };
      productCreateSchema.parse(finalData);
      
      if (!user || !user.id) {
        throw new Error("Utilisateur non connecté");
      }
      
      await createProduct(user.id, finalData);
      
      setOpen(false);
      setEvents([]);
      productForm.reset();
      onProductAdded?.();
    } catch (error) {
      console.error("Erreur lors de l'ajout du produit", error);

      productForm.setError("root", {
        type: "server",
        message: "Une erreur est survenue lors de l'ajout du produit.",
      });
    }
  };

  const onSubmitEvent = (data: EventCreate) => {
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
  
    eventForm.setValue("type", "single"); 
  };

  const removeEvent = (index: number) => {
    setEvents((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Ajouter un produit</Button>
      </DialogTrigger>
      <DialogContent className="p-6 bg-gray-900 border border-gray-700 shadow-xl max-h-[90vh] overflow-y-auto">
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
                        <SelectItem className="hover:text-white hover:bg-gray-700" value="7446a49c-4053-4751-837a-c968a3f568ba">
                          Véhicules
                        </SelectItem>
                        <SelectItem className="hover:text-white hover:bg-gray-700" value="dbc134fb-9558-476d-88c7-75992a249adc">
                          Assurance
                        </SelectItem>
                        <SelectItem className="hover:text-white hover:bg-gray-700" value="9817e487-b43a-47b8-9cc7-ba5bf785bcdd">
                          Aliments
                        </SelectItem>
                        <SelectItem className="hover:text-white hover:bg-gray-700" value="ec088b7c-0a78-4c41-84f4-21c7626d9707">
                          Médical
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="mt-6 p-4 border border-gray-700 rounded-md shadow-2xl bg-gray-800">
              <h3 className="text-lg font-semibold mb-4">Ajouter un événement</h3>
              <Form {...eventForm} key={eventForm.watch("type")}>
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
                    <div className="flex gap-4">
                      <FormField control={eventForm.control} name="durationValue"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <Label>Durée</Label>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Valeur" 
                                {...field} 
                                onChange={(e) => field.onChange(e.target.valueAsNumber)} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField control={eventForm.control} name="durationUnit"
                        render={({ field }) => (
                          <FormItem className="flex-1">
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
                    </div>
                  )}

                  {eventForm.watch("type") === "single" && (
                    <>
                      <FormField control={eventForm.control} name="date"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <Label>Date de l&apos;événement</Label>
                            <FormControl>
                              <Input 
                                type="date" 
                                defaultValue={new Date().toISOString().split("T")[0]} 
                                onChange={(e) => field.onChange(new Date(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField control={eventForm.control} name="isRecurring"
                        render={({ field }) => (
                          <FormItem className="space-y-0 flex flex-row items-center gap-2 mt-3 mb-3">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} className="h-5 w-5" />
                            </FormControl>
                            <Label className="text-gray-300">Récurrence</Label>
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
            {productForm.formState.errors.root && (
              <p className="text-red-500 text-sm mt-2">
                {productForm.formState.errors.root.message}
              </p>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}