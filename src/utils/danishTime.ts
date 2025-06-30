
import { format, formatDistanceToNow } from 'date-fns';
import { da } from 'date-fns/locale';

// Convert UTC to Danish time using the correct Europe/Copenhagen timezone
export const toDanishTime = (utcDate: string | Date): Date => {
  const date = new Date(utcDate);
  
  // Use the browser's Intl API to convert to Copenhagen timezone
  const danishTime = new Date(date.toLocaleString("en-US", {timeZone: "Europe/Copenhagen"}));
  
  return danishTime;
};

export const formatDanishTime = (utcDate: string | Date, formatString: string = 'dd/MM/yyyy HH:mm'): string => {
  const date = new Date(utcDate);
  
  // Format directly using the Europe/Copenhagen timezone
  const danishTimeString = date.toLocaleString("da-DK", {
    timeZone: "Europe/Copenhagen",
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  // Convert to the requested format
  if (formatString === 'HH:mm') {
    return danishTimeString.split(' ')[1];
  } else if (formatString === 'dd/MM/yyyy') {
    return danishTimeString.split(' ')[0];
  } else if (formatString === 'dd/MM/yyyy HH:mm') {
    return danishTimeString;
  }
  
  // For other formats, use date-fns with the correctly converted date
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
  const now = new Date();
  return new Date(now.toLocaleString("en-US", {timeZone: "Europe/Copenhagen"}));
};
