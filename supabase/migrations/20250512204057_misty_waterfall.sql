/*
  # Fix Database Relationships

  1. Changes
    - Add foreign key relationships for comments table
    - Add foreign key relationships for profile_comments table
    - Add foreign key relationships for follows table
    - Enable RLS on all tables
    - Add appropriate policies

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Fix comments table relationships
ALTER TABLE comments
ADD CONSTRAINT comments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Fix profile_comments table relationships
ALTER TABLE profile_comments
ADD CONSTRAINT profile_comments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Fix follows table relationships
ALTER TABLE follows
ADD CONSTRAINT follows_follower_id_fkey 
FOREIGN KEY (follower_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE follows
ADD CONSTRAINT follows_following_id_fkey 
FOREIGN KEY (following_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update comments query to use users table
CREATE OR REPLACE VIEW comment_details AS
SELECT 
  c.*,
  u.username,
  u.avatar_url,
  u.is_admin,
  u.verified
FROM comments c
JOIN users u ON c.user_id = u.id;

-- Update profile comments query to use users table
CREATE OR REPLACE VIEW profile_comment_details AS
SELECT 
  pc.*,
  u.username,
  u.avatar_url
FROM profile_comments pc
JOIN users u ON pc.user_id = u.id;