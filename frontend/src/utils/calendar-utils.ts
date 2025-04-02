import { EventImpl } from '@fullcalendar/core/internal';
import { EventContentArg } from '@fullcalendar/core';

// Définition d'une interface pour les propriétés étendues de nos événements
interface EventExtendedProps {
  productId: string;
  productName: string;
  category: string;
  type?: string;
}

/**
 * Détermine les classes de style pour un événement du calendrier en fonction de son état et de son type
 * @param event - L'événement du calendrier
 * @param isExpired - Indique si l'événement est expiré
 * @returns Un objet contenant les classes CSS pour le style de l'événement
 */
export function getEventStyleClasses(
  event: EventImpl | EventContentArg['event'], 
  isExpired: boolean
): {
  bgColorClass: string;
  borderColorClass: string;
  glowEffect: string;
} {
  let bgColorClass = "from-blue-500 to-blue-600";
  let borderColorClass = "border-blue-700";
  let glowEffect = "after:bg-blue-400/10";
  
  if (isExpired) {
    bgColorClass = "from-gray-600 to-gray-700";
    borderColorClass = "border-gray-700";
    glowEffect = "after:bg-gray-400/10";
  } else if (event.extendedProps && (event.extendedProps as EventExtendedProps).type === "single") {
    bgColorClass = "from-emerald-500 to-emerald-600";
    borderColorClass = "border-emerald-700";
    glowEffect = "after:bg-emerald-400/10";
  } else if (event.title.toLowerCase().includes("garantie")) {
    bgColorClass = "from-indigo-500 to-indigo-600";
    borderColorClass = "border-indigo-700";
    glowEffect = "after:bg-indigo-400/10";
  }

  return {
    bgColorClass,
    borderColorClass,
    glowEffect
  };
}

/**
 * Renvoie les classes CSS complètes pour un événement du calendrier
 * @param event - L'événement du calendrier
 * @param isExpired - Indique si l'événement est expiré
 * @returns Une chaîne de classes CSS pour l'événement
 */
export function getEventClassNames(
  event: EventImpl | EventContentArg['event'], 
  isExpired: boolean
): string {
  const { bgColorClass, borderColorClass, glowEffect } = getEventStyleClasses(event, isExpired);
  
  return `p-1.5 bg-gradient-to-r ${bgColorClass} border-l-3 ${borderColorClass} rounded shadow-md h-full flex flex-col justify-center transition-colors duration-150 hover:opacity-90 relative overflow-hidden after:content-[''] after:absolute after:top-0 after:left-0 after:w-full after:h-full after:opacity-60 ${glowEffect} after:mix-blend-soft-light`;
} 