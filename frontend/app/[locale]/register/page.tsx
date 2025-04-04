'use client';

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { use } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { registerUser } from "@/services/authService";
import { LanguageSelector } from "@/components/ui/language-selector";
import { AppFooter } from "@/components/ui/footer-app";
import { useTranslations } from 'next-intl';

export default function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = useTranslations();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const locale = use(params);

  const registerSchema = z.object({
    email: z.string().email({ message: t('validation.email.invalid') }),
    name: z.string().min(3, { message: t('validation.name.min') }),
    username: z.string().min(3, { message: t('validation.username.min') }),
    password: z.string()
      .min(6, { message: t('validation.password.min') })
      .regex(/[A-Z]/, { message: t('validation.password.uppercase') })
      .regex(/[0-9]/, { message: t('validation.password.number') }),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('validation.password.match'),
    path: ["confirmPassword"],
  });

  type RegisterFormValues = z.infer<typeof registerSchema>;

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      name: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    try {
      await registerUser(data.name, data.username, data.email, data.password);
      router.push(`/${locale.locale}/login`);
    } catch (error) {
      console.error("Erreur lors de l'inscription", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>
      
      <div className="flex-grow flex items-center justify-center">
        <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-center mb-6">{t('register.title')}</h2>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('register.form.email')}</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder={t('register.form.emailPlaceholder')} {...field} 
                        className="bg-gray-700 border-gray-600" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField control={form.control} name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('register.form.name')}</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder={t('register.form.namePlaceholder')} {...field} 
                        className="bg-gray-700 border-gray-600" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField control={form.control} name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('register.form.username')}</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder={t('register.form.usernamePlaceholder')} {...field} 
                        className="bg-gray-700 border-gray-600" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField control={form.control} name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('register.form.password')}</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder={t('register.form.passwordPlaceholder')} {...field} 
                        className="bg-gray-700 border-gray-600" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField control={form.control} name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('register.form.confirmPassword')}</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder={t('register.form.confirmPasswordPlaceholder')} {...field} 
                        className="bg-gray-700 border-gray-600" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={loading}>
                {loading ? t('register.form.submitting') : t('register.form.submit')}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              {t('register.form.alreadyAccount')}{" "}
              <Link href={`/${locale.locale}/login`} className="text-purple-400 hover:text-purple-300">
                {t('register.form.loginLink')}
              </Link>
            </p>
          </div>
        </div>
      </div>
      
      <AppFooter />
    </div>
  );
} 