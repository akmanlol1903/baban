/*
  # Add cum markers table

  1. New Tables
    - `cum_markers` - Stores timestamps where users came during videos
      - `id` (uuid, primary key)
      - `video_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key)
      - `timestamp` (integer)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS
    - Add appropriate policies
*/

CREATE TABLE IF NOT EXISTS cum_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE cum_markers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all cum markers"
  ON cum_markers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own cum markers"
  ON cum_markers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);