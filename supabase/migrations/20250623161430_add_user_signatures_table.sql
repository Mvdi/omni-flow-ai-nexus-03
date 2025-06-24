-- Table for storing user-specific signatures
create table if not exists user_signatures (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  html text not null,
  plain text,
  font_family text default 'Arial',
  extra_text text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Each user can only have one active signature
create unique index if not exists user_signatures_user_id_idx on user_signatures(user_id);
