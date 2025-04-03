import apiClient from "@/services/apiClient";
import { LoginData, LoginSchema } from "@/types/auth";
import { UserSchema } from "@/types/user";

export const login = async (username: string, password: string) => {
  try {
    const parsedData: LoginData = LoginSchema.parse({ username, password });
    const response = await apiClient.post("/auth/login", parsedData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getUserProfile = async () => {
  try {
    const response = await apiClient.get("/auth/me");
    return UserSchema.parse(response.data);
  } catch (error) {
    throw error;
  }
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

export const logout = async () => {
  try {
    await apiClient.post("/auth/logout");
    localStorage.removeItem("user");
    // Nous ne faisons pas de redirection ici - elle sera gérée par les composants
  } catch (error) {
    throw error;
  }
};