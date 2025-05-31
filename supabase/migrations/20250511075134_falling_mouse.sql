/*
  # Add online status to users table

  1. Changes
    - Add is_online boolean field to users table
    - Add last_seen timestamp field to users table
*/

ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT now();