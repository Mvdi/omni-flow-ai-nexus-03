import { useState } from 'react';
import { validateFormData, type ValidationResult } from '@/utils/security';
import { supabase } from '@/integrations/supabase/client';

interface ValidationOptions {
  serverSideValidation?: boolean;
}

export const useSecureValidation = () => {
  const [isValidating, setIsValidating] = useState(false);

  const validateClientSide = (data: Record<string, any>): ValidationResult => {
    return validateFormData(data);
  };

  const validateServerSide = async (data: Record<string, any>): Promise<ValidationResult> => {
    setIsValidating(true);
    try {
      const { data: result, error } = await supabase.rpc('validate_form_input', {
        input_data: data
      });

      if (error) {
        console.error('Server validation error:', error);
        return {
          isValid: false,
          errors: [error.message || 'Server validation failed']
        };
      }

      return {
        isValid: true,
        errors: []
      };
    } catch (error: any) {
      return {
        isValid: false,
        errors: [error.message || 'Validation failed']
      };
    } finally {
      setIsValidating(false);
    }
  };

  const validateForm = async (
    data: Record<string, any>, 
    options: ValidationOptions = {}
  ): Promise<ValidationResult> => {
    // Always run client-side validation first
    const clientResult = validateClientSide(data);
    
    if (!clientResult.isValid) {
      return clientResult;
    }

    // Run server-side validation if requested
    if (options.serverSideValidation) {
      return await validateServerSide(data);
    }

    return clientResult;
  };

  return {
    validateForm,
    validateClientSide,
    validateServerSide,
    isValidating
  };
};