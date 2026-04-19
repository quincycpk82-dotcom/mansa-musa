-- Schedule Mansa's autonomous runs via pg_cron (enable in Supabase: Database → Extensions → pg_cron + pg_net)
-- Replace PROJECT_REF and SERVICE_ROLE_KEY before running.

-- Scout runs 3x/day: 6 AM, 12 PM, 8 PM ET (adjust to your TZ; pg_cron uses UTC)
-- 6 AM ET = 10 UTC, 12 PM ET = 16 UTC, 8 PM ET = 00 UTC
select cron.schedule(
  'mansa-scout-morning',
  '0 10 * * *',
  $$
  select net.http_post(
    url := 'https://PROJECT_REF.supabase.co/functions/v1/mansa-scout',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer SERVICE_ROLE_KEY'),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule('mansa-scout-midday', '0 16 * * *', $$
  select net.http_post(
    url := 'https://PROJECT_REF.supabase.co/functions/v1/mansa-scout',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer SERVICE_ROLE_KEY'),
    body := '{}'::jsonb
  );
$$);

select cron.schedule('mansa-scout-evening', '0 0 * * *', $$
  select net.http_post(
    url := 'https://PROJECT_REF.supabase.co/functions/v1/mansa-scout',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer SERVICE_ROLE_KEY'),
    body := '{}'::jsonb
  );
$$);

-- Notify runs once daily at 7 AM ET (11 UTC) — aligns with Captain's morning brief preference
select cron.schedule('mansa-notify-morning', '0 11 * * *', $$
  select net.http_post(
    url := 'https://PROJECT_REF.supabase.co/functions/v1/mansa-notify',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer SERVICE_ROLE_KEY'),
    body := '{}'::jsonb
  );
$$);

-- To inspect schedules: select * from cron.job;
-- To unschedule: select cron.unschedule('mansa-scout-morning');
