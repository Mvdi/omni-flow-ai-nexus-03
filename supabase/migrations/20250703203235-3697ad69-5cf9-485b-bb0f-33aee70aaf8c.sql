-- Step 1: Enhanced File Upload Security (Fixed)
-- Add file validation to storage policies and create better access controls

-- Update storage policies for better security
CREATE POLICY "Restrict file types in ticket attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'ticket-attachments' AND 
  -- Only allow common safe file types (images, PDFs, docs)
  storage.extension(name) IN ('jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx', 'xls')
);

-- Step 2: Enhanced Rate Limiting Table
CREATE TABLE IF NOT EXISTS public.enhanced_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'api_call',
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on enhanced rate limits
ALTER TABLE public.enhanced_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rate limits
CREATE POLICY "Service role can manage enhanced rate limits" 
ON public.enhanced_rate_limits 
FOR ALL 
USING (auth.role() = 'service_role'::text);

-- Step 3: Enhanced Security Event Logging
ALTER TABLE public.security_events 
ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'application',
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS resolved_by UUID;

-- Step 4: Input Validation Enhancement Function
CREATE OR REPLACE FUNCTION public.enhanced_validate_input(
  input_data JSONB,
  validation_rules JSONB DEFAULT '{}'::JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  validated_data JSONB := '{}';
  errors TEXT[] := '{}';
  rules JSONB;
BEGIN
  rules := COALESCE(validation_rules, '{}'::JSONB);
  
  -- File validation
  IF input_data ? 'file_type' THEN
    IF NOT (input_data->>'file_type' = ANY(ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])) THEN
      errors := errors || 'Invalid file type';
    ELSE
      validated_data := validated_data || jsonb_build_object('file_type', input_data->>'file_type');
    END IF;
  END IF;
  
  -- File size validation (max 10MB)
  IF input_data ? 'file_size' THEN
    IF (input_data->>'file_size')::BIGINT > 10485760 THEN
      errors := errors || 'File size exceeds 10MB limit';
    ELSE
      validated_data := validated_data || jsonb_build_object('file_size', input_data->>'file_size');
    END IF;
  END IF;
  
  -- Enhanced email validation
  IF input_data ? 'email' THEN
    IF NOT (input_data->>'email' ~ '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$') THEN
      errors := errors || 'Invalid email format';
    ELSEIF LENGTH(input_data->>'email') > 254 THEN
      errors := errors || 'Email address too long';
    ELSE
      validated_data := validated_data || jsonb_build_object('email', LOWER(TRIM(input_data->>'email')));
    END IF;
  END IF;
  
  -- URL validation
  IF input_data ? 'url' THEN
    IF NOT (input_data->>'url' ~ '^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(/.*)?$') THEN
      errors := errors || 'Invalid URL format';
    ELSE
      validated_data := validated_data || jsonb_build_object('url', input_data->>'url');
    END IF;
  END IF;
  
  -- Enhanced name validation
  IF input_data ? 'name' THEN
    IF LENGTH(input_data->>'name') < 1 OR LENGTH(input_data->>'name') > 100 THEN
      errors := errors || 'Name must be between 1-100 characters';
    ELSEIF input_data->>'name' ~ '[<>\"''&{}]' THEN
      errors := errors || 'Name contains invalid characters';
    ELSE
      validated_data := validated_data || jsonb_build_object('name', 
        TRIM(REGEXP_REPLACE(input_data->>'name', '\s+', ' ', 'g'))
      );
    END IF;
  END IF;
  
  -- Return result
  IF array_length(errors, 1) > 0 THEN
    RETURN jsonb_build_object(
      'valid', false,
      'errors', to_jsonb(errors),
      'data', '{}'::JSONB
    );
  ELSE
    RETURN jsonb_build_object(
      'valid', true,
      'errors', '[]'::JSONB,
      'data', validated_data
    );
  END IF;
END;
$$;

-- Step 5: Enhanced rate limiting function
CREATE OR REPLACE FUNCTION public.enhanced_rate_limit_check(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_action_type TEXT DEFAULT 'api_call',
  p_max_requests INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 60
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_count INTEGER;
  window_start TIMESTAMP WITH TIME ZONE;
  result JSONB;
BEGIN
  window_start := NOW() - INTERVAL '1 minute' * p_window_minutes;
  
  -- Clean up old rate limit records
  DELETE FROM public.enhanced_rate_limits 
  WHERE window_start < (NOW() - INTERVAL '1 day');
  
  -- Count current requests in window
  SELECT COALESCE(SUM(request_count), 0) 
  INTO request_count
  FROM public.enhanced_rate_limits 
  WHERE identifier = p_identifier 
    AND endpoint = p_endpoint 
    AND action_type = p_action_type
    AND window_start >= window_start;
  
  -- Check if limit exceeded
  IF request_count >= p_max_requests THEN
    -- Log security event for rate limit violation
    INSERT INTO public.security_events (
      event_type,
      severity,
      details,
      ip_address
    ) VALUES (
      'rate_limit_exceeded',
      'high',
      jsonb_build_object(
        'identifier', p_identifier,
        'endpoint', p_endpoint,
        'action_type', p_action_type,
        'current_count', request_count,
        'limit', p_max_requests
      ),
      NULL  -- IP will be set by calling function
    );
    
    RETURN jsonb_build_object(
      'allowed', false,
      'current_count', request_count,
      'limit', p_max_requests,
      'reset_at', window_start + INTERVAL '1 minute' * p_window_minutes
    );
  END IF;
  
  -- Record this request
  INSERT INTO public.enhanced_rate_limits (
    identifier, 
    endpoint, 
    action_type, 
    request_count, 
    window_start,
    metadata
  ) VALUES (
    p_identifier, 
    p_endpoint, 
    p_action_type, 
    1, 
    NOW(),
    jsonb_build_object('timestamp', NOW())
  );
  
  RETURN jsonb_build_object(
    'allowed', true,
    'current_count', request_count + 1,
    'limit', p_max_requests,
    'reset_at', window_start + INTERVAL '1 minute' * p_window_minutes
  );
END;
$$;