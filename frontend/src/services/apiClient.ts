import axios from "axios";
import { toast } from "react-hot-toast";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = document.cookie
    .split("; ")
    .find((row) => row.startsWith("jwt="))
    ?.split("=")[1];

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 400) {
      toast.error("Erreur de validation, veuillez vérifier vos données.");
    } else if (error.response?.status === 401) {
      toast.error("Session expirée, veuillez vous reconnecter.");
      window.location.href = "/login";
    } else if (error.response?.status === 500) {
      toast.error("Erreur serveur, veuillez réessayer plus tard.");
    }
    return Promise.reject(error);
  }
);

export default apiClient;