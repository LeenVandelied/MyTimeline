'use client';

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { registerUser } from "@/services/authService";
import { LanguageSelector } from "@/components/ui/language-selector";
import { AppFooter } from "@/components/ui/footer-app";
import { useTranslation } from '../../i18n/client';

export default function RegisterPage({ params: { locale } }: { params: { locale: string } }) {
  const { t } = useTranslation(locale, 'auth');
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const registerSchema = z.object({
    email: z.string().email({ message: "Email invalide" }),
    name: z.string().min(3, { message: "Le nom doit contenir au moins 3 caractères" }),
    username: z.string().min(3, { message: "Le nom d'utilisateur doit contenir au moins 3 caractères" }),
    password: z.string()
      .min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" })
      .regex(/[A-Z]/, { message: "Le mot de passe doit contenir au moins une majuscule" })
      .regex(/[0-9]/, { message: "Le mot de passe doit contenir au moins un chiffre" }),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
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
      router.push(`/${locale}/login`);
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('register.form.email')}</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder={t('register.form.emailPlaceholder')} {...field} />
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
                      <Input type="text" placeholder={t('register.form.namePlaceholder')} {...field} />
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
                      <Input type="text" placeholder={t('register.form.usernamePlaceholder')} {...field} />
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
                      <Input type="password" placeholder={t('register.form.passwordPlaceholder')} {...field} />
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
                      <Input type="password" placeholder={t('register.form.confirmPasswordPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                {loading ? t('register.form.submitting') : t('register.form.submit')}
              </Button>
            </form>
          </Form>

          <p className="text-center text-gray-400 text-sm mt-4">
            {t('register.form.alreadyAccount')}{" "}
            <Link href={`/${locale}/login`} className="text-blue-400 hover:underline">
              {t('register.form.loginLink')}
            </Link>
          </p>
        </div>
      </div>
      
      <AppFooter locale={locale} />
    </div>
  );
} 