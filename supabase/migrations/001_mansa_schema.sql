-- Mansa Musa schema — run via: supabase db push

-- User interests that the scout agent uses to tune searches
create table if not exists mansa_interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  category text not null,           -- 'tax', 'investing', 'real_estate', 'saas', 'coaching', 'fitness', 'brand'
  keywords text[] not null,
  priority int default 5,           -- 1-10, weights frequency
  enabled boolean default true,
  created_at timestamptz default now()
);

-- Discovered leads/opportunities
create table if not exists mansa_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  summary text not null,
  source text not null,             -- 'web', 'reddit', 'hn', 'producthunt'
  source_url text,
  category text not null,           -- tax, investing, real_estate, saas, coaching, fitness, brand, gig, content, grant, affiliate, general
  relevance_score int not null,     -- 1-10
  income_type text,                 -- 'active', 'passive', 'semi_passive', 'savings', 'none'
  estimated_monthly int,            -- realistic monthly $ potential, 0 if savings/educational
  time_to_first_dollar text,        -- 'same_week', '2_4_weeks', '1_3_months', '3_6_months', '6_plus_months'
  effort_hours int,                 -- total hours to first revenue
  why_relevant text,
  suggested_action text,
  status text default 'new',        -- 'new', 'interesting', 'archived', 'acted_on'
  discovered_at timestamptz default now(),
  notified_at timestamptz
);

create index if not exists idx_leads_status on mansa_leads(user_id, status, discovered_at desc);
create index if not exists idx_leads_score on mansa_leads(user_id, relevance_score desc);

-- Agent run log for observability
create table if not exists mansa_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  run_type text not null,           -- 'scout', 'notify'
  status text not null,             -- 'success', 'error', 'partial'
  leads_found int default 0,
  details jsonb,
  started_at timestamptz default now(),
  completed_at timestamptz
);

-- RLS
alter table mansa_interests enable row level security;
alter table mansa_leads enable row level security;
alter table mansa_runs enable row level security;

create policy "own interests" on mansa_interests for all using (auth.uid() = user_id);
create policy "own leads" on mansa_leads for all using (auth.uid() = user_id);
create policy "own runs" on mansa_runs for all using (auth.uid() = user_id);

-- Seed Captain's interests (replace YOUR_USER_ID after running auth.users setup)
-- insert into mansa_interests (user_id, category, keywords, priority) values
--   ('YOUR_USER_ID', 'tax', ARRAY['s-corp election', 'backdoor roth', 'cost segregation', 'qbi deduction', 'solo 401k'], 9),
--   ('YOUR_USER_ID', 'investing', ARRAY['dip opportunity', 'dividend aristocrat', 'options strategy', 'tech stocks'], 8),
--   ('YOUR_USER_ID', 'real_estate', ARRAY['BRRRR Florida', 'short term rental', 'rental market Georgia', 'refinance opportunity'], 8),
--   ('YOUR_USER_ID', 'saas', ARRAY['indie hacker', 'micro SaaS idea', 'AI wrapper startup', 'fintech opportunity'], 9),
--   ('YOUR_USER_ID', 'coaching', ARRAY['financial coach pricing', 'AFC certification', 'fitness coaching productization', 'cohort course launch'], 9),
--   ('YOUR_USER_ID', 'brand', ARRAY['creator economy', 'influencer marketing platform', 'BrandLenz competitor', 'personal brand monetization'], 7),
--   ('YOUR_USER_ID', 'gig', ARRAY['React developer contract', 'Supabase consulting', 'AI integration freelance', 'fractional CTO', 'technical advisor equity'], 9),
--   ('YOUR_USER_ID', 'content', ARRAY['paid newsletter Substack', 'LinkedIn creator monetization', 'YouTube fintech channel', 'financial education TikTok'], 8),
--   ('YOUR_USER_ID', 'grant', ARRAY['Black founder grant', 'HBCU alumni funding', 'AI fintech accelerator', 'pitch competition fintech', 'Florida small business grant'], 9),
--   ('YOUR_USER_ID', 'affiliate', ARRAY['fintech affiliate program', 'AI tool partnership', 'course affiliate high ticket', 'SaaS referral program'], 7),
--   ('YOUR_USER_ID', 'fitness', ARRAY['athlete coaching program', 'former athlete brand deal', 'fitness app creator', 'training program launch'], 7);
