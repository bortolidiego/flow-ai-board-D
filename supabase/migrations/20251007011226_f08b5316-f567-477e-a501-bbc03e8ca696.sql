-- Revert to public schema and recreate cron job correctly
DROP EXTENSION IF EXISTS pg_cron CASCADE;
DROP EXTENSION IF EXISTS pg_net CASCADE;

-- Create extensions in public schema (standard approach for Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Recreate the cron job
SELECT cron.schedule(
  'analyze-cards-periodically',
  '*/15 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://fpivkpyvicqkhgxdmbck.supabase.co/functions/v1/analyze-cards-cron',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwaXZrcHl2aWNxa2hneGRtYmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1ODYxNzMsImV4cCI6MjA3NTE2MjE3M30.28PICsqRPI9X4T4sNC-c89Pa2r_6r5r0OpkXuoytgEE"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);