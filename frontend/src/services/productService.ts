import { ProductCreate } from "@/types/product";
import apiClient from "./apiClient";

export const createProduct = async (productData: ProductCreate) => {
  try {
    const response = await apiClient.post("/products", productData);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la création du produit :", error);
    throw error;
  }
};