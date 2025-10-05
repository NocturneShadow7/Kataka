/*
  # Create Notifications System

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users) - recipient
      - `type` (text) - Type of notification: order_created, invoice_confirmed, invoice_rejected, sim_expired, sim_renewed, payment_received, new_message
      - `title` (text) - Notification title
      - `message` (text) - Notification message
      - `related_id` (uuid, nullable) - ID of related entity (order_id, invoice_id, etc)
      - `is_read` (boolean, default false)
      - `is_dismissed` (boolean, default false)
      - `priority` (text, default 'normal') - Priority: low, normal, high, urgent
      - `created_at` (timestamptz)
      
  2. Security
    - Enable RLS on notifications table
    - Users can view their own notifications
    - Users can update their own notifications (mark as read/dismissed)
    - Admins can view all notifications
    - System can insert notifications for any user
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('order_created', 'invoice_confirmed', 'invoice_rejected', 'sim_expired', 'sim_renewed', 'payment_received', 'new_message')),
  title text NOT NULL,
  message text NOT NULL,
  related_id uuid,
  is_read boolean DEFAULT false NOT NULL,
  is_dismissed boolean DEFAULT false NOT NULL,
  priority text DEFAULT 'normal' NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all notifications"
ON notifications FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "System can insert notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(is_read) WHERE is_read = false;