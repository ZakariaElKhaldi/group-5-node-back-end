-- PostgreSQL initialization script
-- This runs automatically when the container starts for the first time

-- Create extension for UUID generation (if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create extension for full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Note: Sequelize will handle table creation via sync()
-- This file is for PostgreSQL-specific extensions and initial setup
