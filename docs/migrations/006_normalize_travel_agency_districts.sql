-- Normalize legacy district labels in the travel_agencies directory.
-- Run after migration 005. New syncs now use the source file's district.

UPDATE travel_agencies
SET district = CASE LOWER(TRIM(district))
    WHEN 'east' THEN 'Gangtok'
    WHEN 'east district' THEN 'Gangtok'
    WHEN 'east sikkim' THEN 'Gangtok'
    WHEN 'gangtok district' THEN 'Gangtok'
    WHEN 'north' THEN 'Mangan'
    WHEN 'north district' THEN 'Mangan'
    WHEN 'north sikkim' THEN 'Mangan'
    WHEN 'mangan district' THEN 'Mangan'
    WHEN 'south' THEN 'Namchi'
    WHEN 'south district' THEN 'Namchi'
    WHEN 'south sikkim' THEN 'Namchi'
    WHEN 'namchi district' THEN 'Namchi'
    WHEN 'west' THEN 'Gyalshing'
    WHEN 'west district' THEN 'Gyalshing'
    WHEN 'west sikkim' THEN 'Gyalshing'
    WHEN 'gyalshing district' THEN 'Gyalshing'
    WHEN 'soreng district' THEN 'Soreng'
    WHEN 'pakyong district' THEN 'Pakyong'
    ELSE TRIM(district)
END
WHERE district IS NOT NULL;
