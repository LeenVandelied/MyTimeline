"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { registerUser } from "@/services/authService";
import { FormField, FormMessage } from "@/components/ui/form";
import Link from "next/link";

const registerSchema = z.object({
  name: z.string().min(3, { message: "Le nom doit contenir au moins 3 caractères" }),
  email: z.string().email({ message: "L'email est invalide" }),
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

const RegisterForm = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const methods = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const { handleSubmit } = methods;

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    try {
      await registerUser(
        data.name,
        data.username,
        data.email,
        data.password
      );

      router.push("/login");
    } catch (error) {
      console.error("Erreur lors de l'inscription", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center mb-6">Créer un compte</h2>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField name="email">
              {({ value, onChange }) => <Input type="email" placeholder="Email" value={value} onChange={onChange} className="border-gray-50/10 text-gray-50"/>}
            </FormField>
            <FormField name="name">
              {({ value, onChange }) => <Input type="test" placeholder="Name" value={value} onChange={onChange} className="border-gray-50/10 text-gray-50"/>}
            </FormField>
            <FormMessage name="email" />
            <FormField name="username">
              {({ value, onChange }) => <Input type="text" placeholder="Nom d'utilisateur" value={value} onChange={onChange} className="border-gray-50/10 text-gray-50"/>}
            </FormField>
            <FormMessage name="username" />
            <FormField name="password">
              {({ value, onChange }) => <Input type="password" placeholder="Mot de passe" value={value} onChange={onChange} className="border-gray-50/10 text-gray-50"/>}
            </FormField>
            <FormMessage name="password" />
            <FormField name="confirmPassword">
              {({ value, onChange }) => <Input type="password" placeholder="Confirmer le mot de passe" value={value} onChange={onChange} className="border-gray-50/10 text-gray-50"/>}
            </FormField>
            <FormMessage name="confirmPassword" />
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? "Inscription..." : "S'inscrire"}
            </Button>
          </form>
        </FormProvider>

        <p className="text-center text-gray-400 text-sm mt-4">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-blue-400 hover:underline">
            Connectez-vous
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterForm;