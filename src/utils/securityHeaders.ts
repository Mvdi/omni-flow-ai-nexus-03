/**
 * Security headers utilities for enhanced protection
 */

export const getSecurityHeaders = (additionalHeaders: Record<string, string> = {}) => {
  return {
    // CORS headers
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    
    // Security headers
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    
    // Content Security Policy
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.mapbox.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https://*.supabase.co https://*.mapbox.com",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co https://*.mapbox.com wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '),
    
    // Additional security
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    
    // Custom headers
    ...additionalHeaders
  };
};

export const getJSONHeaders = (additionalHeaders: Record<string, string> = {}) => {
  return {
    ...getSecurityHeaders(additionalHeaders),
    'Content-Type': 'application/json'
  };
};

export const getHTMLHeaders = (additionalHeaders: Record<string, string> = {}) => {
  return {
    ...getSecurityHeaders(additionalHeaders),
    'Content-Type': 'text/html; charset=utf-8'
  };
};