import { Event, EventEditFormValues } from "@/types/event";
import apiClient from "./apiClient";

export const getEventsByProductId = async (userId: string, productId: string): Promise<Event[]> => {
  try {
    const response = await apiClient.get(`/users/${userId}/products/${productId}/events`);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des événements :", error);
    throw error;
  }
};

export const updateEventColor = async (eventId: string, color: string): Promise<Event> => {
  try {
    const response = await apiClient.patch(`/events/${eventId}`, { backgroundColor: color });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la couleur de l'événement :", error);
    throw error;
  }
};

export const updateEvent = async (eventId: string, data: EventEditFormValues): Promise<Event> => {
  try {
    const response = await apiClient.patch(`/events/${eventId}`, data);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'événement :", error);
    throw error;
  }
}; 