/*
  # Add comments and video features

  1. New Tables
    - `comments`
      - `id` (uuid, primary key)
      - `video_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key)
      - `content` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on comments table
    - Add policies for comments
*/

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Comments policies
CREATE POLICY "Users can read all comments"
  ON comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add cascade delete policy for videos
ALTER TABLE watch_time
  DROP CONSTRAINT watch_time_video_id_fkey,
  ADD CONSTRAINT watch_time_video_id_fkey
    FOREIGN KEY (video_id)
    REFERENCES videos(id)
    ON DELETE CASCADE;

ALTER TABLE votes
  DROP CONSTRAINT votes_video_id_fkey,
  ADD CONSTRAINT votes_video_id_fkey
    FOREIGN KEY (video_id)
    REFERENCES videos(id)
    ON DELETE CASCADE;