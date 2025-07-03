import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://deno.land/x/supabase@1.0.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    // Preflight CORS handler
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Auth check (require admin)
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization header" }), { status: 401, headers: corsHeaders });
  }
  const jwt = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }
  // Optionally check for admin role here
  if (!user.user_metadata?.role || user.user_metadata.role !== "admin") {
    return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: corsHeaders });
  }

  const { client_id, client_secret, tenant_id } = await req.json();
  if (!client_id || !client_secret || !tenant_id) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: corsHeaders });
  }

  // Store each secret
  const provider = "office365";
  const upserts = [
    { key_name: "client_id", key_value: client_id },
    { key_name: "client_secret", key_value: client_secret },
    { key_name: "tenant_id", key_value: tenant_id },
  ];
  for (const { key_name, key_value } of upserts) {
    const { error } = await supabase
      .from("integration_secrets")
      .upsert({ provider, key_name, key_value }, { onConflict: ["provider", "key_name"] });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
  }

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
}); 