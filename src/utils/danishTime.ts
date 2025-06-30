
import { format, formatDistanceToNow } from 'date-fns';
import { da } from 'date-fns/locale';

// FORBEDRET dansk tid konvertering - håndterer både vinter- og sommertid
export const toDanishTime = (utcDate: string | Date): Date => {
  const date = new Date(utcDate);
  
  // Brug Intl.DateTimeFormat til at få korrekt dansk tid med automatisk sommertid/vintertid
  const danishTimeString = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
  
  // Konverter fra "YYYY-MM-DD HH:mm:ss" format til Date objekt
  const [datePart, timePart] = danishTimeString.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);
  
  return new Date(year, month - 1, day, hour, minute, second);
};

export const formatDanishTime = (utcDate: string | Date, formatString: string = 'dd/MM/yyyy HH:mm'): string => {
  const danishTime = toDanishTime(utcDate);
  return format(danishTime, formatString, { locale: da });
};

export const formatDanishDistance = (utcDate: string | Date): string => {
  const danishTime = toDanishTime(utcDate);
  return formatDistanceToNow(danishTime, { addSuffix: true, locale: da });
};

export const formatDanishDate = (utcDate: string | Date): string => {
  return formatDanishTime(utcDate, 'dd/MM/yyyy');
};

export const formatDanishDateTime = (utcDate: string | Date): string => {
  return formatDanishTime(utcDate, 'dd/MM/yyyy HH:mm');
};

// Get current Danish time
export const getCurrentDanishTime = (): Date => {
  return toDanishTime(new Date());
};

// Konverter dansk tid til UTC for database storage
export const fromDanishTimeToUTC = (danishTime: Date): Date => {
  const utcTime = new Date(danishTime.toLocaleString('en-US', { timeZone: 'UTC' }));
  const danishOffset = danishTime.getTime() - new Date(danishTime.toLocaleString('en-US', { timeZone: 'Europe/Copenhagen' })).getTime();
  return new Date(utcTime.getTime() - danishOffset);
};
