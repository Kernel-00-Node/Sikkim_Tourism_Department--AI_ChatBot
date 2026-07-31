-- Add weather coordinates to an existing Sikkim Tourism database.
-- New installations already receive these columns from docs/schema.sql.
-- Run this once only if the destinations table was created from an older schema.

ALTER TABLE destinations
  ADD COLUMN latitude DECIMAL(9,6) NULL AFTER image_url,
  ADD COLUMN longitude DECIMAL(9,6) NULL AFTER latitude;
