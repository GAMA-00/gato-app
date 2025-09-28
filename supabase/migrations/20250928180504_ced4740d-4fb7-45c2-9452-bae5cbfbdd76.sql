-- Clean up orphaned identities that are preventing user registration
-- This addresses the "Database error finding user" issue after database cleanup

-- Remove orphaned identities that don't have corresponding users
DELETE FROM auth.identities 
WHERE user_id::uuid NOT IN (SELECT id FROM auth.users);

-- Clean up orphaned sessions for non-existent users
DELETE FROM auth.sessions 
WHERE user_id::uuid NOT IN (SELECT id FROM auth.users);

-- Clean up orphaned refresh tokens for non-existent users  
DELETE FROM auth.refresh_tokens 
WHERE user_id::uuid NOT IN (SELECT id FROM auth.users);

-- Log the cleanup results
SELECT 
  'cleanup_complete' as status,
  'Orphaned auth records cleaned up successfully' as message;