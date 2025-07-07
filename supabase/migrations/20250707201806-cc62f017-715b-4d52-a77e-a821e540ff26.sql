-- Clean existing duplicate listings
-- Keep only the most recent listing for each provider + title combination
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY provider_id, title 
      ORDER BY created_at DESC
    ) as row_num
  FROM listings
)
DELETE FROM listings 
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);

-- Clean orphaned listing_residencias records
DELETE FROM listing_residencias 
WHERE listing_id NOT IN (SELECT id FROM listings);