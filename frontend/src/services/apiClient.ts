import axios from "axios";
import { toast } from "react-hot-toast";
import { refreshToken } from "./authService";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Variable pour suivre si une redirection est en cours
let isRedirecting = false;

// Configurer un rafraîchissement périodique de session pour le mode monitoring
const setupPeriodicRefresh = () => {
  // Rafraîchir la session toutes les 6 heures
  setInterval(async () => {
    try {
      // Tenter de rafraîchir le token silencieusement
      await refreshToken();
    } catch (error) {
      // Ignorer les erreurs silencieusement - elles seront gérées par l'intercepteur si nécessaire
      console.debug("Rafraîchissement périodique silencieux échoué");
    }
  }, 6 * 60 * 60 * 1000); // 6 heures
};

// Initialiser le rafraîchissement périodique côté client
if (typeof window !== 'undefined') {
  setupPeriodicRefresh();
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 400) {
      toast.error("Erreur de validation, veuillez vérifier vos données.");
    } else if (error.response?.status === 401) {
      if (!isRedirecting) {
        isRedirecting = true;
        toast.error("Session expirée, redirection vers la page de connexion...");
        // Nettoyer localStorage
        localStorage.removeItem("user");
        // Rediriger après un court délai pour que le toast soit visible
        setTimeout(() => {
          window.location.href = "/login";
          isRedirecting = false;
        }, 1500);
      }
    } else if (error.response?.status === 403) {
      // Pour les erreurs 403, considérer que la session a expiré
      if (!isRedirecting) {
        isRedirecting = true;
        console.error("Erreur 403 - Accès refusé:", {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          data: error.response?.data
        });
        // Nettoyer localStorage
        localStorage.removeItem("user");
        toast.error("Votre session a expiré, redirection vers la page de connexion...");
        setTimeout(() => {
          window.location.href = "/login";
          isRedirecting = false;
        }, 1500);
      }
    } else if (error.response?.status === 500) {
      toast.error("Erreur serveur, veuillez réessayer plus tard.");
    }
    return Promise.reject(error);
  }
);

export default apiClient;