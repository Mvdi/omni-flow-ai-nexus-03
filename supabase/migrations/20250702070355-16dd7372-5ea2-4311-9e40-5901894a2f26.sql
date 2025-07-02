-- EMERGENCY CATCH-UP: Manual sync for emails from 22:30 yesterday to now
SELECT net.http_post(
  url := 'https://tckynbgheicyqezqprdp.supabase.co/functions/v1/reliable-email-sync',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRja3luYmdoZWljeXFlenFwcmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNTE3OTMsImV4cCI6MjA2NTkyNzc5M30.vJoSHaDDJrbXIzoEww4LDg8EynJ38cvUZ0qX1BWNNgM"}'::jsonb,
  body := '{"source": "emergency-catchup-manual", "priority": "critical", "syncHours": 24, "facebookLeadDetection": true}'::jsonb
);