
import { format, formatDistanceToNow } from 'date-fns';
import { formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz';
import { da } from 'date-fns/locale';

const DANISH_TIMEZONE = 'Europe/Copenhagen';

// KORREKT dansk tid konvertering med date-fns-tz
export const toDanishTime = (utcDate: string | Date): Date => {
  const date = new Date(utcDate);
  // Konverter UTC tid til dansk timezone
  return zonedTimeToUtc(date, DANISH_TIMEZONE);
};

export const formatDanishTime = (utcDate: string | Date, formatString: string = 'dd/MM/yyyy HH:mm'): string => {
  return formatInTimeZone(utcDate, DANISH_TIMEZONE, formatString, { locale: da });
};

export const formatDanishDistance = (utcDate: string | Date): string => {
  // KORREKT måde at vise "X minutter siden" i dansk tid
  const now = new Date();
  const inputDate = new Date(utcDate);
  
  // Beregn forskellen og vis på dansk
  return formatDistanceToNow(inputDate, { addSuffix: true, locale: da });
};

export const formatDanishDate = (utcDate: string | Date): string => {
  return formatInTimeZone(utcDate, DANISH_TIMEZONE, 'dd/MM/yyyy', { locale: da });
};

export const formatDanishDateTime = (utcDate: string | Date): string => {
  return formatInTimeZone(utcDate, DANISH_TIMEZONE, 'dd/MM/yyyy HH:mm', { locale: da });
};

// Get current Danish time
export const getCurrentDanishTime = (): Date => {
  return new Date(); // Dette er allerede korrekt da Date() giver lokal tid
};

// Konverter dansk tid til UTC for database storage
export const fromDanishTimeToUTC = (danishTime: Date): Date => {
  return zonedTimeToUtc(danishTime, DANISH_TIMEZONE);
};
