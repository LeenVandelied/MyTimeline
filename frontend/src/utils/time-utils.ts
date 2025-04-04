/**
 * Calcule le temps restant entre la date actuelle et une date future.
 * Retourne une chaîne formatée avec les années, mois et jours.
 */
export function calculateRemainingTime(
  endDateValue: Date | string | null | undefined, 
  t: (key: string) => string
): string {
  if (!endDateValue) return t('common.time.expired');
  
  const endDate = typeof endDateValue === 'string' 
    ? new Date(endDateValue) 
    : endDateValue;
    
  const currentDate = new Date();
  
  const diffTime = Math.max(0, endDate.getTime() - currentDate.getTime());
  
  if (diffTime === 0) {
    return t('common.time.expired');
  }
  
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const years = Math.floor(diffDays / 365);
  const months = Math.floor((diffDays % 365) / 30);
  const days = Math.floor(diffDays % 30 + 1);
  
  let remainingTime = "";
  
  if (years > 0) {
    remainingTime += `${years} ${years === 1 ? t('common.time.year') : t('common.time.years')} `;
  }
  
  if (months > 0 || years > 0) {
    remainingTime += `${months} ${months === 1 ? t('common.time.month') : t('common.time.months')} `;
  }
  
  if (days > 0 || months > 0 || years > 0) {
    remainingTime += `${days} ${days === 1 ? t('common.time.day') : t('common.time.days')}`;
  }
  
  return remainingTime;
} 