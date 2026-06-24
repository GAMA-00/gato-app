-- Add slot_preferences column to store weekly slot enable/disable patterns per listing
-- Ensures compatibility with the new slot generation preview and persistence
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS slot_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Optional: comment for maintainability
COMMENT ON COLUMN public.listings.slot_preferences IS 'JSON object mapping slot ids/patterns to enabled/disabled state for this listing';