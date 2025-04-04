"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Form, FormField, FormItem, FormMessage, FormControl } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "../ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
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

  const onSubmitEvent = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const isValid = eventForm.trigger();
    if (!isValid) return;
    
    const data = eventForm.getValues();
    eventCreationSchema.parse(data);
    
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
      <DialogContent className="p-6 bg-gray-900 border border-gray-700 shadow-xl max-h-[90vh] overflow-y-auto" aria-describedby="product-dialog-description">
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-semibold">{t('products.add.title')}</DialogTitle>
          <DialogDescription id="product-dialog-description" className="text-gray-400">
            {t('products.add.description')}
          </DialogDescription>
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
              
              {events.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-2">{t('products.add.event.list')}</h4>
                  <ul className="space-y-2">
                    {events.map((event, index) => (
                      <li key={index} className="flex justify-between items-center p-2 bg-gray-700 rounded">
                        <span>
                          {event.name}
                          {event.type === 'duration' && event.durationValue && event.durationUnit && (
                            <> ({event.durationValue} {t(`products.add.event.units.${event.durationUnit}`)})</>
                          )}
                          {event.type === 'single' && event.date && (
                            <> ({new Date(event.date).toLocaleDateString()})</>
                          )}
                        </span>
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => removeEvent(index)}
                        >
                          {t('products.add.event.remove')}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="space-y-4">
                <Form {...eventForm}>
                  <div>
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
                                  value={field.value || ""}
                                  onChange={(e) => {
                                    const value = e.target.value === "" ? undefined : Number(e.target.value);
                                    field.onChange(value);
                                  }}
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
                    )}

                    <div className="mt-4 flex justify-end">
                      <Button 
                        type="button" 
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => onSubmitEvent()}
                      >
                        {t('products.add.form.submit')}
                      </Button>
                    </div>
                  </div>
                </Form>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button 
                type="submit" 
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {t('products.add.form.submit')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}