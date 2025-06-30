
import { format, formatDistanceToNow, addHours } from 'date-fns';
import { da } from 'date-fns/locale';

// Convert UTC to Danish time (UTC+1 or UTC+2 during DST)
export const toDanishTime = (utcDate: string | Date): Date => {
  const date = new Date(utcDate);
  // Check if we're in daylight saving time (last Sunday in March to last Sunday in October)
  const year = date.getFullYear();
  const dstStart = new Date(year, 2, 31 - new Date(year, 2, 31).getDay()); // Last Sunday in March
  const dstEnd = new Date(year, 9, 31 - new Date(year, 9, 31).getDay()); // Last Sunday in October
  
  const isDST = date >= dstStart && date < dstEnd;
  const offset = isDST ? 2 : 1; // UTC+2 during DST, UTC+1 otherwise
  
  return addHours(date, offset);
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
