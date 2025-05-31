/*
  # Add user profiles and stats

  1. Changes to users table
    - Add followers count
    - Add following count
    - Add verified status
    - Add cum stats
  
  2. New Tables
    - `follows` - Track user follows
    - `cum_stats` - Track user cum statistics

  3. Security
    - Enable RLS on new tables
    - Add appropriate policies
*/

-- Update users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cum_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cum_duration INTEGER DEFAULT 0;

-- Create follows table
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(follower_id, following_id)
);

-- Enable RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Create policies for follows
CREATE POLICY "Users can view all follows"
  ON follows FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can follow others"
  ON follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- Create function to update follower counts
CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users SET followers_count = followers_count - 1 WHERE id = OLD.following_id;
    UPDATE users SET following_count = following_count - 1 WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for follower count updates
CREATE TRIGGER on_follow_changed
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE PROCEDURE update_follower_counts();

-- Update the get_leaderboard function to include user info
CREATE OR REPLACE FUNCTION get_leaderboard()
RETURNS TABLE (
  video_id UUID,
  title TEXT,
  uploader_id UUID,
  uploader_username TEXT,
  uploader_avatar_url TEXT,
  total_watch_time BIGINT,
  watcher_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id AS video_id,
    v.title,
    u.id AS uploader_id,
    u.username AS uploader_username,
    u.avatar_url AS uploader_avatar_url,
    COALESCE(SUM(wt.seconds_watched), 0)::BIGINT AS total_watch_time,
    COUNT(DISTINCT wt.user_id)::BIGINT AS watcher_count
  FROM 
    videos v
  JOIN
    users u ON v.uploaded_by = u.id
  LEFT JOIN 
    watch_time wt ON v.id = wt.video_id
  GROUP BY 
    v.id, v.title, u.id, u.username, u.avatar_url
  ORDER BY 
    total_watch_time ASC, watcher_count ASC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;