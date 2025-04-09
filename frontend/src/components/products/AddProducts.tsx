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
import { PlusCircle, X, Calendar, Timer, Clock, Tag, Package, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

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

  const fadeIn = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white border-none">
          <PlusCircle size={16} />
          <span>{t('products.add.title')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0 bg-gray-900 border border-gray-700 shadow-xl max-h-[90vh] overflow-y-auto sm:max-w-[600px] rounded-xl" aria-describedby="product-dialog-description">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-900 to-indigo-900 p-5 rounded-t-xl shadow-md">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold flex items-center">
              <Package className="mr-2 h-6 w-6" />
              {t('products.add.title')}
            </DialogTitle>
            <DialogDescription id="product-dialog-description" className="text-gray-200">
              {t('products.add.description') || 'Ajoutez un nouveau produit avec ses événements associés'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6">
          <Form {...productForm}>
            <form onSubmit={productForm.handleSubmit(onSubmitProduct)} className="space-y-6">
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <FormField control={productForm.control} name="name"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="text-gray-200 flex items-center">
                        <Tag className="mr-2 h-4 w-4" />
                        {t('products.add.form.name')}
                      </Label>
                      <FormControl>
                        <Input 
                          placeholder={t('products.add.form.namePlaceholder')} 
                          {...field} 
                          className="bg-gray-800 border-gray-700 text-white focus:border-purple-500 focus:ring-purple-500"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField control={productForm.control} name="category"
                  render={({ field }) => (
                    <FormItem>
                      <Label className="text-gray-200 flex items-center">
                        <Tag className="mr-2 h-4 w-4" />
                        {t('products.add.form.category')}
                      </Label>
                      <FormControl>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger className="bg-gray-800 border-gray-700 text-white focus:border-purple-500 focus:ring-purple-500">
                            <SelectValue placeholder={t('products.add.form.categoryPlaceholder')} />
                          </SelectTrigger>
                          <SelectContent className="text-gray-300 bg-gray-800 border border-gray-700">
                            <SelectItem className="hover:text-white hover:bg-gray-700 focus:bg-gray-700" value="7446a49c-4053-4751-837a-c968a3f568ba">
                              {t('products.add.categories.vehicles')}
                            </SelectItem>
                            <SelectItem className="hover:text-white hover:bg-gray-700 focus:bg-gray-700" value="dbc134fb-9558-476d-88c7-75992a249adc">
                              {t('products.add.categories.insurance')}
                            </SelectItem>
                            <SelectItem className="hover:text-white hover:bg-gray-700 focus:bg-gray-700" value="9817e487-b43a-47b8-9cc7-ba5bf785bcdd">
                              {t('products.add.categories.food')}
                            </SelectItem>
                            <SelectItem className="hover:text-white hover:bg-gray-700 focus:bg-gray-700" value="ec088b7c-0a78-4c41-84f4-21c7626d9707">
                              {t('products.add.categories.medical')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div 
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="mt-8 p-5 border border-gray-700 rounded-xl shadow-lg bg-gray-800 backdrop-blur-sm bg-opacity-70"
              >
                <h3 className="text-lg font-semibold mb-4 text-white flex items-center">
                  <Clock className="mr-2 h-5 w-5 text-purple-400" />
                  {t('products.add.event.title')}
                </h3>
                
                {events.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium mb-3 text-gray-300">{t('products.add.event.list')}</h4>
                    <ul className="space-y-2">
                      {events.map((event, index) => (
                        <motion.li
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2 }}
                          key={index} 
                          className="flex justify-between items-center p-3 bg-gray-700 rounded-lg border border-gray-600 group hover:border-purple-500 transition-all"
                        >
                          <span className="text-gray-200 flex items-center">
                            {event.type === 'duration' ? 
                              <Timer className="mr-2 h-4 w-4 text-blue-400" /> : 
                              <Calendar className="mr-2 h-4 w-4 text-green-400" />
                            }
                            <span className="font-medium">{event.name}</span>
                            {event.type === 'duration' && event.durationValue && event.durationUnit && (
                              <span className="ml-2 text-sm text-gray-400">
                                ({event.durationValue} {t(`products.add.event.units.${event.durationUnit}`)})
                              </span>
                            )}
                            {event.type === 'single' && event.date && (
                              <span className="ml-2 text-sm text-gray-400">
                                ({new Date(event.date).toLocaleDateString()})
                              </span>
                            )}
                          </span>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeEvent(index)}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-gray-600 transition-opacity"
                          >
                            <X size={16} />
                          </Button>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="space-y-4 bg-gray-850 p-4 rounded-lg border border-gray-700">
                  <Form {...eventForm}>
                    <div className="space-y-4">
                      <FormField control={eventForm.control} name="name"
                        render={({ field }) => (
                          <FormItem>
                            <Label className="text-gray-200">{t('products.add.event.form.name')}</Label>
                            <FormControl>
                              <Input placeholder={t('products.add.event.form.namePlaceholder')} {...field} 
                                className="bg-gray-800 border-gray-700 text-white focus:border-purple-500 focus:ring-purple-500" />
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />

                      <FormField control={eventForm.control} name="type"
                        render={({ field }) => (
                          <FormItem>
                            <Label className="text-gray-200">{t('products.add.event.form.type')}</Label>
                            <FormControl>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger className="bg-gray-800 border-gray-700 text-white focus:border-purple-500 focus:ring-purple-500">
                                  <SelectValue placeholder={t('products.add.event.form.typePlaceholder')} />
                                </SelectTrigger>
                                <SelectContent className="text-gray-300 bg-gray-800 border border-gray-700">
                                  <SelectItem className="hover:text-white hover:bg-gray-700 focus:bg-gray-700" value="duration">
                                    <div className="flex items-center">
                                      <Timer className="mr-2 h-4 w-4 text-blue-400" />
                                      {t('products.add.event.types.duration')}
                                    </div>
                                  </SelectItem>
                                  <SelectItem className="hover:text-white hover:bg-gray-700 focus:bg-gray-700" value="single">
                                    <div className="flex items-center">
                                      <Calendar className="mr-2 h-4 w-4 text-green-400" />
                                      {t('products.add.event.types.single')}
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />

                      {eventForm.watch("type") === "duration" && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex gap-4"
                        >
                          <FormField control={eventForm.control} name="durationValue"
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <Label className="text-gray-200">{t('products.add.event.form.durationValue')}</Label>
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
                                    className="bg-gray-800 border-gray-700 text-white focus:border-purple-500 focus:ring-purple-500"
                                  />
                                </FormControl>
                                <FormMessage className="text-red-400" />
                              </FormItem>
                            )}
                          />
                          <FormField control={eventForm.control} name="durationUnit"
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <Label className="text-gray-200">{t('products.add.event.form.durationUnit')}</Label>
                                <FormControl>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white focus:border-purple-500 focus:ring-purple-500">
                                      <SelectValue placeholder={t('products.add.event.form.durationUnitPlaceholder')} />
                                    </SelectTrigger>
                                    <SelectContent className="text-gray-300 bg-gray-800 border border-gray-700">
                                      <SelectItem className="hover:text-white hover:bg-gray-700 focus:bg-gray-700" value="days">
                                        {t('products.add.event.units.days')}
                                      </SelectItem>
                                      <SelectItem className="hover:text-white hover:bg-gray-700 focus:bg-gray-700" value="weeks">
                                        {t('products.add.event.units.weeks')}
                                      </SelectItem>
                                      <SelectItem className="hover:text-white hover:bg-gray-700 focus:bg-gray-700" value="months">
                                        {t('products.add.event.units.months')}
                                      </SelectItem>
                                      <SelectItem className="hover:text-white hover:bg-gray-700 focus:bg-gray-700" value="years">
                                        {t('products.add.event.units.years')}
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage className="text-red-400" />
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      )}

                      {eventForm.watch("type") === "single" && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FormField control={eventForm.control} name="date"
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <Label className="text-gray-200">{t('products.add.event.form.date')}</Label>
                                <FormControl>
                                  <Input 
                                    type="date" 
                                    defaultValue={new Date().toISOString().split("T")[0]} 
                                    onChange={(e) => field.onChange(new Date(e.target.value))}
                                    className="bg-gray-800 border-gray-700 text-white focus:border-purple-500 focus:ring-purple-500"
                                  />
                                </FormControl>
                                <FormMessage className="text-red-400" />
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      )}

                      <div className="mt-4 flex justify-end">
                        <Button 
                          type="button" 
                          className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 transition-all transform hover:translate-y-[-2px]"
                          onClick={() => onSubmitEvent()}
                        >
                          <PlusCircle size={16} />
                          {t('products.add.form.submit')}
                        </Button>
                      </div>
                    </div>
                  </Form>
                </div>
              </motion.div>

              <motion.div 
                initial="hidden"
                animate="visible"
                variants={fadeIn}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="mt-8 flex justify-end"
              >
                <Button 
                  type="submit" 
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 shadow-lg hover:shadow-purple-500/30 transition-all transform hover:translate-y-[-2px]"
                >
                  {t('products.add.form.submit')}
                  <ArrowRight size={16} />
                </Button>
              </motion.div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}