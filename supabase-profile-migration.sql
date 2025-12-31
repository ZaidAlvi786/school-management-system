-- Add profile_picture column to users table
-- Run this SQL in your Supabase SQL Editor

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_picture TEXT;

COMMENT ON COLUMN users.profile_picture IS 'URL or data URL of user profile picture';

