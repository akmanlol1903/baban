/*
  # Add admin user and update users table

  1. Changes
    - Add admin flag to specified user
    - Ensure RLS policies are updated for admin access

  2. Security
    - Only authenticated users can access admin features
    - Admin status is protected by RLS
*/

-- Set admin status for a specific user (replace with your Discord user ID)
UPDATE users 
SET is_admin = true 
WHERE id = (SELECT id FROM auth.users WHERE email = current_user)
RETURNING *;

-- Ensure RLS policy exists for admin access
CREATE POLICY "Allow admins full access" ON videos
FOR ALL
TO authenticated
USING (
  (SELECT is_admin FROM users WHERE id = auth.uid())
)
WITH CHECK (
  (SELECT is_admin FROM users WHERE id = auth.uid())
);