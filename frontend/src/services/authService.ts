import apiClient from "@/services/apiClient";
import { LoginData, LoginSchema } from "@/types/auth";
import { UserSchema } from "@/types/user";
import axios from 'axios';

// Vous devriez remplacer ceci par l'URL de votre API d'authentification
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.mytimeline.com';

export const login = async (username: string, password: string) => {
  // Pour une démo, simulons une réponse réussie
  // Dans une véritable implémentation, vous feriez un appel API ici
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      // Stocker un token fictif pour simuler l'authentification
      localStorage.setItem('token', 'demo-token-1234');
      resolve();
    }, 1000);
  });
};

export const register = async (username: string, email: string, password: string) => {
  // Pour une démo, simulons une réponse réussie
  // Dans une véritable implémentation, vous feriez un appel API ici
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      // Dans une vraie implémentation, l'API retournerait une confirmation d'inscription
      resolve();
    }, 1000);
  });
};

export const logout = () => {
  localStorage.removeItem('token');
};

export const getUserProfile = async () => {
  // Pour une démo, retournons un profil utilisateur fictif
  // Dans une véritable implémentation, vous feriez un appel API ici
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: '1',
        username: 'demo_user',
        email: 'demo@example.com',
        role: 'user'
      });
    }, 500);
  });
};

export const registerUser = async (name: string, username: string, email: string, password: string) => {
  try {
    return apiClient.post("/auth/register", { name,username, email, password });
  } catch (error) {
    throw error;
  }
};

export const refreshToken = async () => {
  try {
    await apiClient.post("/auth/refresh");
    return true;
  } catch (error) {
    console.error("Erreur lors du rafraîchissement du token:", error);
    return false;
  }
};