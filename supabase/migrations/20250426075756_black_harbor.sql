/*
  # Initial schema for VideoChat platform

  1. New Tables
    - `users` - Stores user information
    - `videos` - Stores video metadata
    - `watch_time` - Tracks user watch time for videos
    - `messages` - Stores chat messages between users
    - `votes` - Tracks user votes for videos
  
  2. Functions
    - `get_leaderboard` - Returns videos ordered by least watched
  
  3. Security
    - Enable RLS on all tables
    - Add policies for data access
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  is_admin BOOLEAN DEFAULT false NOT NULL
);

-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create watch_time table
CREATE TABLE IF NOT EXISTS watch_time (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  seconds_watched INTEGER NOT NULL DEFAULT 0,
  last_watched TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, video_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, video_id)
);

-- Create function to get leaderboard (least watched videos)
CREATE OR REPLACE FUNCTION get_leaderboard()
RETURNS TABLE (
  video_id UUID,
  title TEXT,
  total_watch_time BIGINT,
  watcher_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id AS video_id,
    v.title,
    COALESCE(SUM(wt.seconds_watched), 0)::BIGINT AS total_watch_time,
    COUNT(DISTINCT wt.user_id)::BIGINT AS watcher_count
  FROM 
    videos v
  LEFT JOIN 
    watch_time wt ON v.id = wt.video_id
  GROUP BY 
    v.id, v.title
  ORDER BY 
    total_watch_time ASC, watcher_count ASC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Enable row level security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_time ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view all users" 
  ON users FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can update their own data" 
  ON users FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id);

-- Create policies for videos table
CREATE POLICY "Anyone can view videos" 
  ON videos FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Admins can insert videos" 
  ON videos FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

CREATE POLICY "Admins can update videos" 
  ON videos FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Create policies for watch_time table
CREATE POLICY "Users can view all watch times" 
  ON watch_time FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can insert their own watch time" 
  ON watch_time FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watch time" 
  ON watch_time FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Create policies for messages table
CREATE POLICY "Users can see messages they sent or received" 
  ON messages FOR SELECT 
  TO authenticated 
  USING (
    auth.uid() = sender_id OR 
    auth.uid() = receiver_id OR 
    receiver_id IS NULL
  );

CREATE POLICY "Users can insert messages" 
  ON messages FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = sender_id);

-- Create policies for votes table
CREATE POLICY "Users can see all votes" 
  ON votes FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can insert their own votes" 
  ON votes FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes" 
  ON votes FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Create trigger to handle user creation after auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.created_at,
    NEW.created_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();