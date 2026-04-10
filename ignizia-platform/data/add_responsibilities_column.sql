-- Add responsibilities column to occupations table
-- This column stores job responsibilities/work activities in JSON format

ALTER TABLE occupations 
ADD COLUMN IF NOT EXISTS responsibilities JSONB;

-- Add comment for the new column
COMMENT ON COLUMN occupations.responsibilities IS 'JSON object containing job responsibilities and work activities for the role';

-- Create index for JSONB column to improve query performance
CREATE INDEX IF NOT EXISTS idx_occupations_responsibilities ON occupations USING GIN(responsibilities);
