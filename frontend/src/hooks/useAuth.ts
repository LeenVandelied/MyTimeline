import { useEffect, useState } from "react";
import { getUserProfile, login as loginService, logout as logoutService, register as registerService } from "../services/authService";
import { User } from "@/types/auth";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const data = await getUserProfile();
      setUser(data);

      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(data));
      }
    } catch (error) {
      console.error("User fetch failed", error);
      setUser(null);

      if (typeof window !== "undefined") {
        localStorage.removeItem("user");
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      await loginService(username, password);
      await fetchUser();
    } catch (error) {
      console.error("Login failed", error);
    } finally {
      setLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string) => {
    setLoading(true);
    try {
      await registerService(username, email, password);
      // Notez que nous n'appelons pas fetchUser ici car l'inscription ne connecte pas automatiquement l'utilisateur
    } catch (error) {
      console.error("Registration failed", error);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    logoutService();
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
    }
  };

  return { user, login, register, logout, loading };
};