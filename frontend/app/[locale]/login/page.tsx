'use client';

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { use } from 'react';
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/useAuth";
import { LoginData } from "@/types/auth";
import { LanguageSelector } from "@/components/ui/language-selector";
import { AppFooter } from "@/components/ui/footer-app";
import { useTranslations } from 'next-intl';

export default function LoginPage({ params }: { params: Promise<{ locale: string }>} ) {
  const t = useTranslations();
  const router = useRouter();
  const { login, loading, user } = useAuth();
  
  const { locale } = use(params);
  
  const loginSchema = z.object({
    username: z.string().min(3, { message: t('validation.username.min') }),
    password: z.string().min(6, { message: t('validation.password.min') }),
  });

  type LoginFormValues = z.infer<typeof loginSchema>;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  useEffect(() => {
    if (user) {
      router.replace(`/${locale}/dashboard`);
    }
  }, [user, router, locale]);

  const onSubmit = async (data: LoginData) => {
    await login(data.username, data.password);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white">
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>
      
      <div className="flex-grow flex items-center justify-center">
        <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-center mb-6">{t('login.title')}</h2>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('login.username')}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="johndoe" 
                        {...field} 
                        className="bg-gray-700 border-gray-600"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('login.password')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••" 
                        {...field} 
                        className="bg-gray-700 border-gray-600"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={loading}
              >
                {loading ? t('login.loading') : t('login.submit')}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              {t('login.noAccount')} <Link href={`/${locale}/register`} className="text-purple-400 hover:text-purple-300">{t('login.register')}</Link>
            </p>
            <p className="text-gray-400 mt-2">
              <Link href={`/${locale}`} className="text-purple-400 hover:text-purple-300">&larr; {t('navigation.backToHome')}</Link>
            </p>
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  );
} 