/*
  # Add profile comments table

  1. New Tables
    - `profile_comments` - Stores comments on user profiles
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `profile_username` (text)
      - `content` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS
    - Add appropriate policies
*/

CREATE TABLE IF NOT EXISTS profile_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_username TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE profile_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all profile comments"
  ON profile_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create profile comments"
  ON profile_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON profile_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);