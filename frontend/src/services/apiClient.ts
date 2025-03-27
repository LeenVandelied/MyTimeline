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

let isRedirecting = false;

const setupPeriodicRefresh = () => {
  setInterval(async () => {
    try {
      await refreshToken();
    } catch (error) {
      console.debug("Rafraîchissement périodique silencieux échoué", error);
    }
  }, 6 * 60 * 60 * 1000); // 6 heures
};

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
        localStorage.removeItem("user");
        setTimeout(() => {
          window.location.href = "/login";
          isRedirecting = false;
        }, 1500);
      }
    } else if (error.response?.status === 403) {
      if (!isRedirecting) {
        isRedirecting = true;
        console.error("Erreur 403 - Accès refusé:", {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          data: error.response?.data
        });
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