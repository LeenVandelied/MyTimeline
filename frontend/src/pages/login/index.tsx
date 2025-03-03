import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema, LoginData } from "@/types/auth";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const Login = () => {
  const { login, loading, user } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginData>({
    resolver: zodResolver(LoginSchema),
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
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <Card className="w-full max-w-md p-6 shadow-lg bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-center text-2xl">Connexion</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label className="text-gray-400" htmlFor="username">Nom d&apos;utilisateur</Label>
              <Input 
                id="username"
                type="text"
                placeholder="Entrez votre nom d'utilisateur"
                {...register("username")}
                className="mt-1 bg-gray-700 text-white border-gray-600"
              />
              {errors.username && <p className="text-red-500 text-sm">{errors.username.message}</p>}
            </div>
            <div>
              <Label className="text-gray-400" htmlFor="password">Mot de passe</Label>
              <Input 
                id="password"
                type="password"
                placeholder="••••••••"
                {...register("password")}
                className="mt-1 bg-gray-700 text-white border-gray-600"
              />
              {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
            </div>
            <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading} type="submit">
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;