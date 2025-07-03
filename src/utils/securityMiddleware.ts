/**
 * Security middleware utilities for enhanced protection
 */

import { getSecurityHeaders } from './securityHeaders';

export const withSecurityHeaders = (handler: (req: Request) => Promise<Response>) => {
  return async (req: Request): Promise<Response> => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { 
        headers: getSecurityHeaders(),
        status: 200 
      });
    }

    try {
      // Execute the original handler
      const response = await handler(req);
      
      // Add security headers to the response
      const securityHeaders = getSecurityHeaders();
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      return response;
    } catch (error) {
      console.error('Security middleware error:', error);
      
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...getSecurityHeaders()
          }
        }
      );
    }
  };
};

export const validateRequestHeaders = (req: Request): boolean => {
  const userAgent = req.headers.get('user-agent');
  const contentType = req.headers.get('content-type');
  
  // Basic validation checks
  if (!userAgent || userAgent.length < 10) {
    return false;
  }
  
  // Check for suspicious patterns in user agent
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scanner/i,
    /sqlmap/i,
    /nikto/i
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
    return false;
  }
  
  return true;
};

export const logSecurityViolation = async (
  violation: string,
  details: Record<string, any>,
  request: Request
) => {
  console.error('Security violation detected:', {
    violation,
    details,
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || 'unknown',
    timestamp: new Date().toISOString()
  });
  
  // In a production environment, you might want to:
  // - Send alerts to monitoring systems
  // - Log to external security services
  // - Trigger automatic blocking mechanisms
};