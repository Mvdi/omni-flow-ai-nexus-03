-- Create table for secure storage of integration secrets (API keys)
create table if not exists integration_secrets (
  id uuid primary key default uuid_generate_v4(),
  provider text not null, -- fx 'office365'
  key_name text not null, -- fx 'client_id', 'client_secret', 'tenant_id'
  key_value text not null,
  created_at timestamptz default now()
);

-- Only service_role (backend) should have access
-- (You may need to adjust RLS policies in Supabase dashboard for extra security)
