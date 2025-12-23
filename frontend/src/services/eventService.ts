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

interface EventColors {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

export const updateEventColor = async (eventId: string, colors: EventColors): Promise<void> => {
  try {
    const response = await apiClient.patch(`/events/${eventId}`, colors);
    
    if (!response.data) {
      throw new Error('Failed to update event colors');
    }
  } catch (error) {
    console.error('Error updating event colors:', error);
    throw error;
  }
};

export const updateEvent = async (eventId: string, data: EventEditFormValues): Promise<void> => {
  try {
    const response = await apiClient.patch(`/events/${eventId}`, data);
    
    if (!response.data) {
      throw new Error('Failed to update event');
    }
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
}; 