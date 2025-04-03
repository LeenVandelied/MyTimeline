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
import { useTranslations } from 'next-intl';

interface AddProductProps {
  onProductAdded?: () => void;
}

export default function AddProduct({ onProductAdded }: AddProductProps) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<EventCreate[]>([]);
  const { user } = useAuth();
  const t = useTranslations();
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
        message: t('products.add.form.error'),
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
        <Button variant="outline">{t('products.add.title')}</Button>
      </DialogTrigger>
      <DialogContent className="p-6 bg-gray-900 border border-gray-700 shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-semibold">{t('products.add.title')}</DialogTitle>
        </DialogHeader>

        <Form {...productForm}>
          <form onSubmit={productForm.handleSubmit(onSubmitProduct)}>
            <FormField control={productForm.control} name="name"
              render={({ field }) => (
                <FormItem>
                  <Label>{t('products.add.form.name')}</Label>
                  <FormControl>
                    <Input placeholder={t('products.add.form.namePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField control={productForm.control} name="category"
              render={({ field }) => (
                <FormItem>
                  <Label>{t('products.add.form.category')}</Label>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('products.add.form.categoryPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent className="text-gray-300 bg-gray-900">
                        <SelectItem className="hover:text-white hover:bg-gray-700" value="7446a49c-4053-4751-837a-c968a3f568ba">
                          {t('products.add.categories.vehicles')}
                        </SelectItem>
                        <SelectItem className="hover:text-white hover:bg-gray-700" value="dbc134fb-9558-476d-88c7-75992a249adc">
                          {t('products.add.categories.insurance')}
                        </SelectItem>
                        <SelectItem className="hover:text-white hover:bg-gray-700" value="9817e487-b43a-47b8-9cc7-ba5bf785bcdd">
                          {t('products.add.categories.food')}
                        </SelectItem>
                        <SelectItem className="hover:text-white hover:bg-gray-700" value="ec088b7c-0a78-4c41-84f4-21c7626d9707">
                          {t('products.add.categories.medical')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="mt-6 p-4 border border-gray-700 rounded-md shadow-2xl bg-gray-800">
              <h3 className="text-lg font-semibold mb-4">{t('products.add.event.title')}</h3>
              <Form {...eventForm} key={eventForm.watch("type")}>
                <form onSubmit={eventForm.handleSubmit(onSubmitEvent)}>
                  <FormField control={eventForm.control} name="name"
                    render={({ field }) => (
                      <FormItem>
                        <Label>{t('products.add.event.form.name')}</Label>
                        <FormControl>
                          <Input placeholder={t('products.add.event.form.namePlaceholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField control={eventForm.control} name="type"
                    render={({ field }) => (
                      <FormItem>
                        <Label>{t('products.add.event.form.type')}</Label>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder={t('products.add.event.form.typePlaceholder')} />
                            </SelectTrigger>
                            <SelectContent className="text-gray-300 bg-gray-900">
                              <SelectItem className="hover:text-white hover:bg-gray-700" value="duration">
                                {t('products.add.event.types.duration')}
                              </SelectItem>
                              <SelectItem className="hover:text-white hover:bg-gray-700" value="single">
                                {t('products.add.event.types.single')}
                              </SelectItem>
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
                            <Label>{t('products.add.event.form.durationValue')}</Label>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder={t('products.add.event.form.durationValue')} 
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
                            <Label>{t('products.add.event.form.durationUnit')}</Label>
                            <FormControl>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('products.add.event.form.durationUnitPlaceholder')} />
                                </SelectTrigger>
                                <SelectContent className="text-gray-300 bg-gray-900">
                                  <SelectItem className="hover:text-white hover:bg-gray-700" value="days">
                                    {t('products.add.event.units.days')}
                                  </SelectItem>
                                  <SelectItem className="hover:text-white hover:bg-gray-700" value="weeks">
                                    {t('products.add.event.units.weeks')}
                                  </SelectItem>
                                  <SelectItem className="hover:text-white hover:bg-gray-700" value="months">
                                    {t('products.add.event.units.months')}
                                  </SelectItem>
                                  <SelectItem className="hover:text-white hover:bg-gray-700" value="years">
                                    {t('products.add.event.units.years')}
                                  </SelectItem>
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
                            <Label>{t('products.add.event.form.date')}</Label>
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
                            <Label>{t('products.add.event.form.recurring')}</Label>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {eventForm.watch("isRecurring") && (
                        <FormField control={eventForm.control} name="recurrenceUnit"
                          render={({ field }) => (
                            <FormItem>
                              <Label>{t('products.add.event.form.recurrenceUnit')}</Label>
                              <FormControl>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <SelectTrigger>
                                    <SelectValue placeholder={t('products.add.event.form.recurrenceUnitPlaceholder')} />
                                  </SelectTrigger>
                                  <SelectContent className="text-gray-300 bg-gray-900">
                                    <SelectItem className="hover:text-white hover:bg-gray-700" value="daily">
                                      {t('products.add.event.units.days')}
                                    </SelectItem>
                                    <SelectItem className="hover:text-white hover:bg-gray-700" value="weekly">
                                      {t('products.add.event.units.weeks')}
                                    </SelectItem>
                                    <SelectItem className="hover:text-white hover:bg-gray-700" value="monthly">
                                      {t('products.add.event.units.months')}
                                    </SelectItem>
                                    <SelectItem className="hover:text-white hover:bg-gray-700" value="yearly">
                                      {t('products.add.event.units.years')}
                                    </SelectItem>
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
                    className="mt-4 w-full bg-blue-600 hover:bg-blue-700"
                    onClick={(e) => {
                      e.preventDefault();
                      eventForm.handleSubmit(onSubmitEvent)();
                    }}
                  >
                    {t('products.add.event.form.submit')}
                  </Button>
                </form>
              </Form>
            </div>

            {events.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">{t('products.add.events.list')}</h3>
                <ul className="space-y-2">
                  {events.map((event, index) => (
                    <li key={index} className="flex justify-between items-center p-2 bg-gray-800 rounded">
                      <span>{event.name}  ( {event.durationValue} {event.durationUnit} )</span>
                      <Button onClick={() => removeEvent(index)} variant="destructive" size="sm">
                        {t('products.add.events.remove')}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {events.length === 0 && (
              <div className="mt-6 text-gray-400 text-center">
                {t('products.add.events.empty')}
              </div>
            )}

            <Button type="submit" className="mt-6 w-full bg-green-600 hover:bg-green-700">
              {t('products.add.form.submit')}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}