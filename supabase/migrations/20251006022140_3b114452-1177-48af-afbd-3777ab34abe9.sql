-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule AI analysis to run every 15 minutes
SELECT cron.schedule(
  'analyze-cards-periodically',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT
    net.http_post(
        url:='https://fpivkpyvicqkhgxdmbck.supabase.co/functions/v1/analyze-cards-cron',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwaXZrcHl2aWNxa2hneGRtYmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1ODYxNzMsImV4cCI6MjA3NTE2MjE3M30.28PICsqRPI9X4T4sNC-c89Pa2r_6r5r0OpkXuoytgEE"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

COMMENT ON EXTENSION pg_cron IS 'Extension to run scheduled tasks';
COMMENT ON EXTENSION pg_net IS 'Extension to make HTTP requests from within Postgres';