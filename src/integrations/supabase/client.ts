// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://tckynbgheicyqezqprdp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRja3luYmdoZWljeXFlenFwcmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNTE3OTMsImV4cCI6MjA2NTkyNzc5M30.vJoSHaDDJrbXIzoEww4LDg8EynJ38cvUZ0qX1BWNNgM";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);