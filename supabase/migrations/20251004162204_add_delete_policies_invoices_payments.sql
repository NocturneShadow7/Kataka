/*
  # Add DELETE policies for invoices and payments

  1. Security Changes
    - Add DELETE policy for admins on invoices table
    - Add DELETE policy for admins on payments table

  2. Notes
    - Only admins can delete invoices
    - Only admins can delete payments
*/

-- Admins can delete invoices
CREATE POLICY "Admins can delete invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can delete payments
CREATE POLICY "Admins can delete payments"
  ON payments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
