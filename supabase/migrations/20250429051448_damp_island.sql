/*
  # Add about field to users table

  1. Changes
    - Add about text field to users table for bio/description
*/

ALTER TABLE users
ADD COLUMN IF NOT EXISTS about TEXT;