import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/router";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema, LoginData } from "@/types/auth";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField, FormMessage } from "@/components/ui/form";
import Link from "next/link";

const Login = () => {
  const { login, loading, user } = useAuth();
  const router = useRouter();

  const methods = useForm<LoginData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const { handleSubmit } = methods;

  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const onSubmit = async (data: LoginData) => {
    await login(data.username, data.password);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <Card className="w-full max-w-md p-6 shadow-lg bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-center text-2xl">Connexion</CardTitle>
        </CardHeader>
        <CardContent>
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FormField name="username">
                {({ value, onChange }) => <Input type="text" placeholder="Nom d'utilisateur" value={value} onChange={onChange} className="border-gray-50/10 text-gray-50"/>}
              </FormField>
              <FormMessage name="username" />
              <FormField name="password">
                {({ value, onChange }) => <Input type="password" placeholder="Mot de passe" value={value} onChange={onChange} className="border-gray-50/10 text-gray-50"/>}
              </FormField>
              <FormMessage name="password" />
              <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading} type="submit">
                {loading ? "Connexion..." : "Se connecter"}
              </Button>
              <p className="text-center text-sm text-gray-400">
                Pas encore de compte ?{" "}
                <Link href="/register" className="text-blue-500 hover:underline">
                  S&apos;inscrire
                </Link>
              </p>
            </form>
          </FormProvider>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;