-- Fix recurring rules with missing client names
UPDATE recurring_rules 
SET client_name = users.name
FROM users 
WHERE recurring_rules.client_id = users.id 
  AND recurring_rules.client_name IS NULL;