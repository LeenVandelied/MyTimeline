"use client";

import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { GetStaticProps } from 'next';
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { registerUser } from "@/services/authService";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import Link from "next/link";

const RegisterForm = () => {
  const { t } = useTranslation(['auth', 'validation', 'errors']);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const registerSchema = z.object({
    email: z.string().email({ message: t('validation:email.invalid') }),
    name: z.string().min(3, { message: t('validation:name.min') }),
    username: z.string().min(3, { message: t('validation:username.min') }),
    password: z.string()
      .min(6, { message: t('validation:password.min') })
      .regex(/[A-Z]/, { message: t('validation:password.uppercase') })
      .regex(/[0-9]/, { message: t('validation:password.number') }),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('validation:password.match'),
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
      router.push("/login");
    } catch (error) {
      console.error(t('errors:auth.register'), error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-6">{t('auth:register.title')}</h2>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth:register.form.email')}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder={t('auth:register.form.emailPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField control={form.control} name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth:register.form.name')}</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder={t('auth:register.form.namePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField control={form.control} name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth:register.form.username')}</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder={t('auth:register.form.usernamePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField control={form.control} name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth:register.form.password')}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={t('auth:register.form.passwordPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField control={form.control} name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth:register.form.confirmPassword')}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={t('auth:register.form.confirmPasswordPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? t('auth:register.form.submitting') : t('auth:register.form.submit')}
            </Button>
          </form>
        </Form>

        <p className="text-center text-gray-400 text-sm mt-4">
          {t('auth:register.form.alreadyAccount')}{" "}
          <Link href="/login" className="text-blue-400 hover:underline">
            {t('auth:register.form.loginLink')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'fr', ['auth', 'validation', 'errors'])),
    },
  };
};

export default RegisterForm;