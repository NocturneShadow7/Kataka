/*
  # Add INSERT Policy for Order Items

  1. Changes
    - Add INSERT policy to allow users to create order items for their own orders
    
  2. Security
    - Users can only insert order items for orders they own
    - Verified through the orders.client_id check
*/

CREATE POLICY "Users can insert their own order items"
ON order_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.client_id = auth.uid()
  )
);