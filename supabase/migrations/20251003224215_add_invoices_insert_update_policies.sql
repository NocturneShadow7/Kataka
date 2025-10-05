/*
  # Add INSERT and UPDATE Policies for Invoices

  1. Changes
    - Add INSERT policy to allow users to create invoices for their own orders
    - Add UPDATE policy to allow users to update their own invoices
    
  2. Security
    - Users can only insert invoices for themselves
    - Users can only update their own invoices
    - Admins can update any invoice
*/

CREATE POLICY "Users can insert their own invoices"
ON invoices FOR INSERT
TO authenticated
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Users can update their own invoices"
ON invoices FOR UPDATE
TO authenticated
USING (client_id = auth.uid())
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Admins can update all invoices"
ON invoices FOR UPDATE
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