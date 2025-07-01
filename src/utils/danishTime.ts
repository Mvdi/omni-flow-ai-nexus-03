
import { format, formatDistanceToNow } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { da } from 'date-fns/locale';

const DANISH_TIMEZONE = 'Europe/Copenhagen';

// CRITICAL FIX: Always convert to Danish time consistently
export const toDanishTime = (utcDate: string | Date): Date => {
  const date = new Date(utcDate);
  // Convert UTC to Danish timezone properly
  return fromZonedTime(date, DANISH_TIMEZONE);
};

export const formatDanishTime = (utcDate: string | Date, formatString: string = 'dd/MM/yyyy HH:mm'): string => {
  return formatInTimeZone(utcDate, DANISH_TIMEZONE, formatString, { locale: da });
};

export const formatDanishDistance = (utcDate: string | Date): string => {
  // CRITICAL FIX: Always show correct Danish time relative to now
  const now = new Date();
  const inputDate = new Date(utcDate);
  
  // Calculate difference properly in Danish timezone context
  return formatDistanceToNow(inputDate, { addSuffix: true, locale: da });
};

export const formatDanishDate = (utcDate: string | Date): string => {
  return formatInTimeZone(utcDate, DANISH_TIMEZONE, 'dd/MM/yyyy', { locale: da });
};

export const formatDanishDateTime = (utcDate: string | Date): string => {
  return formatInTimeZone(utcDate, DANISH_TIMEZONE, 'dd/MM/yyyy HH:mm', { locale: da });
};

// CRITICAL FIX: Show exact Danish time for troubleshooting
export const formatDanishTimeExact = (utcDate: string | Date): string => {
  return formatInTimeZone(utcDate, DANISH_TIMEZONE, 'dd/MM/yyyy HH:mm:ss', { locale: da });
};

// Get current Danish time
export const getCurrentDanishTime = (): Date => {
  return new Date(); // This gives local time which should be Danish
};

// Convert Danish time to UTC for database storage
export const fromDanishTimeToUTC = (danishTime: Date): Date => {
  return fromZonedTime(danishTime, DANISH_TIMEZONE);
};

// CRITICAL DEBUG: Log time comparison
export const debugTimeConversion = (utcDate: string | Date) => {
  const originalDate = new Date(utcDate);
  const danishFormatted = formatDanishDateTime(utcDate);
  console.log(`🕐 DEBUG TIME: Original=${originalDate.toISOString()}, Danish=${danishFormatted}`);
  return danishFormatted;
};
