/*
  # Add edited message tracking

  1. Changes
    - Add edited boolean field to messages table
    - Add updated_at timestamp field to messages table
*/

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS edited BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();