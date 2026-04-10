-- Create table for occupations with skills, knowledge, and abilities
CREATE TABLE IF NOT EXISTS occupations (
    role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(255) NOT NULL,
    skills JSONB,
    knowledge JSONB,
    abilities JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on role_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_occupations_role_name ON occupations(role_name);

-- Create index on role_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_occupations_role_id ON occupations(role_id);

-- Add comment to describe the table
COMMENT ON TABLE occupations IS 'Table storing occupation data including skills, knowledge, and abilities in JSON format';
COMMENT ON COLUMN occupations.role_id IS 'Unique identifier for the role (UUID)';
COMMENT ON COLUMN occupations.role_name IS 'Name of the occupation/role';
COMMENT ON COLUMN occupations.skills IS 'JSON object containing skills required for the role';
COMMENT ON COLUMN occupations.knowledge IS 'JSON object containing knowledge areas for the role';
COMMENT ON COLUMN occupations.abilities IS 'JSON object containing abilities required for the role';
