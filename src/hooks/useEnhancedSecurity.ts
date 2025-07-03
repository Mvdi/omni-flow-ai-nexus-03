import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SecurityCheck {
  isAllowed: boolean;
  currentCount?: number;
  limit?: number;
  resetAt?: string;
  errors?: string[];
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  data: Record<string, any>;
}

export const useEnhancedSecurity = () => {
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  const checkRateLimit = async (
    identifier: string,
    endpoint: string,
    actionType: string = 'api_call',
    maxRequests: number = 10,
    windowMinutes: number = 60
  ): Promise<SecurityCheck> => {
    try {
      const { data, error } = await supabase.rpc('enhanced_rate_limit_check', {
        p_identifier: identifier,
        p_endpoint: endpoint,
        p_action_type: actionType,
        p_max_requests: maxRequests,
        p_window_minutes: windowMinutes
      });

      if (error) {
        console.error('Rate limit check error:', error);
        return { isAllowed: false, errors: [error.message] };
      }

      const result = data as any;
      return {
        isAllowed: result.allowed,
        currentCount: result.current_count,
        limit: result.limit,
        resetAt: result.reset_at
      };
    } catch (error: any) {
      console.error('Rate limit check failed:', error);
      return { isAllowed: false, errors: [error.message] };
    }
  };

  const validateInput = async (
    inputData: Record<string, any>,
    validationRules?: Record<string, any>
  ): Promise<ValidationResult> => {
    setIsChecking(true);
    
    try {
      const { data, error } = await supabase.rpc('enhanced_validate_input', {
        input_data: inputData,
        validation_rules: validationRules || {}
      });

      if (error) {
        console.error('Input validation error:', error);
        return {
          valid: false,
          errors: [error.message],
          data: {}
        };
      }

      const result = data as any;
      return {
        valid: result.valid,
        errors: result.errors || [],
        data: result.data || {}
      };
    } catch (error: any) {
      console.error('Input validation failed:', error);
      return {
        valid: false,
        errors: [error.message],
        data: {}
      };
    } finally {
      setIsChecking(false);
    }
  };

  const logSecurityEvent = async (
    eventType: string,
    severity: 'low' | 'medium' | 'high' = 'medium',
    details: Record<string, any> = {},
    source: string = 'application'
  ) => {
    try {
      const { error } = await supabase
        .from('security_events')
        .insert({
          event_type: eventType,
          severity,
          details,
          source,
          user_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) {
        console.error('Failed to log security event:', error);
      }
    } catch (error) {
      console.error('Security event logging failed:', error);
    }
  };

  const validateFileUpload = (file: File): ValidationResult => {
    const errors: string[] = [];
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf', 'text/plain', 
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      errors.push('File type not allowed');
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      errors.push('File size exceeds 10MB limit');
    }

    // Check filename for security
    if (!/^[a-zA-Z0-9._-]+$/.test(file.name.split('.')[0])) {
      errors.push('Invalid characters in filename');
    }

    return {
      valid: errors.length === 0,
      errors,
      data: {
        name: file.name,
        size: file.size,
        type: file.type
      }
    };
  };

  const enforceRateLimit = async (
    identifier: string,
    endpoint: string,
    actionType?: string
  ): Promise<boolean> => {
    const check = await checkRateLimit(identifier, endpoint, actionType);
    
    if (!check.isAllowed) {
      toast({
        title: "Rate limit exceeded",
        description: "Please wait before trying again.",
        variant: "destructive",
      });
      
      await logSecurityEvent('rate_limit_violation', 'high', {
        identifier,
        endpoint,
        currentCount: check.currentCount,
        limit: check.limit
      });
      
      return false;
    }
    
    return true;
  };

  return {
    checkRateLimit,
    validateInput,
    logSecurityEvent,
    validateFileUpload,
    enforceRateLimit,
    isChecking
  };
};