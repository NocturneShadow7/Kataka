/*
  # Fix SIMs Foreign Key

  1. Changes
    - Delete orphaned SIMs (those with non-existent client_id)
    - Add foreign key constraint from sims.client_id to profiles.user_id

  2. Notes
    - This ensures data integrity going forward
    - Uses ON DELETE CASCADE to automatically remove SIMs when a client is deleted
*/

-- Delete SIMs with non-existent client_id
DELETE FROM sims
WHERE client_id NOT IN (SELECT user_id FROM profiles);

-- Add foreign key constraint
ALTER TABLE sims
  ADD CONSTRAINT sims_client_id_fkey
  FOREIGN KEY (client_id)
  REFERENCES profiles(user_id)
  ON DELETE CASCADE;