import { ProductCreate } from "@/types/product";
import apiClient from "./apiClient";
import { Product } from "@/types/product";

export const getProducts = async (userId: string): Promise<Product[]> => {
  try {
    const response = await apiClient.get(`/users/${userId}/products`);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des produits :", error);
    throw error;
  }
};

export const createProduct = async (userId: string, productData: ProductCreate) => {
  try {
    const response = await apiClient.post(`/users/${userId}/products`, productData);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la création du produit :", error);
    throw error;
  }
};