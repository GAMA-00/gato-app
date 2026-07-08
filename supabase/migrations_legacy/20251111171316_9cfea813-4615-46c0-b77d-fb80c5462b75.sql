-- ============================================
-- Remove deprecated pgjwt extension
-- This extension is not used by the application
-- ============================================

DROP EXTENSION IF EXISTS pgjwt CASCADE;