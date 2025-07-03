/**
 * Security utilities for input validation and sanitization
 */

// Email validation with comprehensive checks
export const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  return emailRegex.test(email) && 
         email.length <= 254 && 
         !email.includes('..') && 
         !email.startsWith('.') && 
         !email.endsWith('.');
};

// Phone number validation for Danish numbers
export const validateDanishPhone = (phone: string): boolean => {
  if (!phone || typeof phone !== 'string') return false;
  
  const cleanPhone = phone.replace(/\s+/g, '').replace(/[-()]/g, '');
  const danishPhoneRegex = /^(\+45)?[2-9]\d{7}$/;
  
  return danishPhoneRegex.test(cleanPhone);
};

// Address validation
export const validateAddress = (address: string): boolean => {
  if (!address || typeof address !== 'string') return false;
  
  return address.trim().length >= 5 && 
         address.trim().length <= 200 &&
         !/[<>\"'&]/.test(address);
};

// Name validation
export const validateName = (name: string): boolean => {
  if (!name || typeof name !== 'string') return false;
  
  const nameRegex = /^[a-zA-ZæøåÆØÅ\s\-'\.]{2,50}$/;
  return nameRegex.test(name.trim());
};

// Sanitize text input to prevent XSS
export const sanitizeText = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/[<>\"'&]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 1000); // Limit length
};

// Validate postal code (Danish format)
export const validatePostalCode = (postalCode: string): boolean => {
  if (!postalCode || typeof postalCode !== 'string') return false;
  
  const danishPostalRegex = /^\d{4}$/;
  return danishPostalRegex.test(postalCode.trim());
};

// Validate price/number input
export const validatePrice = (price: string | number): boolean => {
  if (typeof price === 'number') {
    return price >= 0 && price <= 1000000 && !isNaN(price);
  }
  
  if (typeof price === 'string') {
    const numPrice = parseFloat(price.replace(/[^\d.,]/g, '').replace(',', '.'));
    return !isNaN(numPrice) && numPrice >= 0 && numPrice <= 1000000;
  }
  
  return false;
};

// Content Security Policy helper
export const getCSPHeader = (): string => {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.mapbox.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https://*.supabase.co https://*.mapbox.com",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co https://*.mapbox.com wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
};

// Rate limiting helper (client-side tracking)
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  isAllowed(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const keyRequests = this.requests.get(key)!;
    
    // Remove old requests outside the window
    const validRequests = keyRequests.filter(time => time > windowStart);
    
    if (validRequests.length >= maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }
  
  reset(key: string): void {
    this.requests.delete(key);
  }
}

export const rateLimiter = new RateLimiter();

// Secure random token generation
export const generateSecureToken = (length: number = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Input validation summary for forms
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateFormData = (data: {
  navn?: string;
  email?: string;
  telefon?: string;
  adresse?: string;
  postnummer?: string;
  [key: string]: any;
}): ValidationResult => {
  const errors: string[] = [];
  
  if (data.navn && !validateName(data.navn)) {
    errors.push('Navn skal være mellem 2-50 tegn og kun indeholde bogstaver');
  }
  
  if (data.email && !validateEmail(data.email)) {
    errors.push('Ugyldig email adresse');
  }
  
  if (data.telefon && !validateDanishPhone(data.telefon)) {
    errors.push('Ugyldigt dansk telefonnummer');
  }
  
  if (data.adresse && !validateAddress(data.adresse)) {
    errors.push('Adresse skal være mellem 5-200 tegn');
  }
  
  if (data.postnummer && !validatePostalCode(data.postnummer)) {
    errors.push('Ugyldigt postnummer (skal være 4 cifre)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};