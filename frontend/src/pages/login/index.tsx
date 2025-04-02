import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { GetStaticProps } from 'next';

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { LoginData } from "@/types/auth";
import { LanguageSelector } from "@/components/ui/language-selector";
import { Footer } from "@/components/ui/footer";

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  try {
    return {
      props: {
        ...(await serverSideTranslations(locale || 'fr', ['common'])),
      },
    };
  } catch (error) {
    console.error('Error in getStaticProps:', error);
    return { props: {} };
  }
};

const LoginForm = () => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { login, loading, user } = useAuth();

  const loginSchema = z.object({
    username: z.string().min(3, { message: t('validation.username') }),
    password: z.string().min(6, { message: t('validation.password') }),
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
      router.replace("/dashboard");
    }
  }, [user, router]);

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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('login.username')}</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder={t('login.username')} {...field} />
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
                    <Input type="password" placeholder={t('login.password')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? t('login.loading') : t('login.submit')}
            </Button>
            </form>
          </Form>

          <p className="text-center text-gray-400 text-sm mt-4">
            {t('login.noAccount')}{" "}
            <Link href="/register" className="text-blue-400 hover:underline">
              {t('login.register')}
            </Link>
          </p>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default LoginForm;