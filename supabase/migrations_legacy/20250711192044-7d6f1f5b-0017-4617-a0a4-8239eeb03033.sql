-- Remove the original_date column that we added
ALTER TABLE public.recurring_exceptions 
DROP COLUMN IF EXISTS original_date;