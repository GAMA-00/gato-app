-- Add original_date column to recurring_exceptions table
ALTER TABLE public.recurring_exceptions 
ADD COLUMN original_date DATE;

-- Add comment to explain the purpose
COMMENT ON COLUMN public.recurring_exceptions.original_date IS 'The original date of the appointment that was rescheduled or cancelled';

-- Update existing records to set original_date = exception_date for backwards compatibility
UPDATE public.recurring_exceptions 
SET original_date = exception_date 
WHERE original_date IS NULL;