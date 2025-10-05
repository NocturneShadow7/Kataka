/*
  # Add Admin Policies for SIMs Management

  1. Changes
    - Add INSERT policy for admins to create SIMs
    - Add UPDATE policy for admins to modify SIMs
    - Add DELETE policy for admins to delete SIMs
    - Add SELECT policy for admins to view all SIMs

  2. Security
    - Only authenticated users with admin role can manage SIMs
    - Clients can only view their own SIMs (existing policy)
*/

-- Allow admins to view all SIMs
CREATE POLICY "Admins can view all sims"
  ON sims
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow admins to create SIMs
CREATE POLICY "Admins can create sims"
  ON sims
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow admins to update SIMs
CREATE POLICY "Admins can update sims"
  ON sims
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow admins to delete SIMs
CREATE POLICY "Admins can delete sims"
  ON sims
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );