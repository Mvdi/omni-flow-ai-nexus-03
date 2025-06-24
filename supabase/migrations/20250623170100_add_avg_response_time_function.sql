-- Migration: Add avg_response_time_for_customer function

CREATE OR REPLACE FUNCTION avg_response_time_for_customer(customer_email_input TEXT)
RETURNS TABLE(avg NUMERIC) AS $$
BEGIN
  RETURN QUERY
    SELECT COALESCE(AVG(response_time_hours), 0) AS avg
    FROM support_tickets
    WHERE customer_email = customer_email_input
      AND response_time_hours IS NOT NULL;
END;
$$ LANGUAGE plpgsql; 