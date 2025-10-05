/*
  # Add server_number to sims table

  ## Changes
  - Add `server_number` column to `sims` table (integer 1-12)
  - This allows admins to track which server each SIM is associated with

  ## Notes
  - Server numbers range from 1 to 12
  - Only visible/editable by admins
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sims' AND column_name = 'server_number'
  ) THEN
    ALTER TABLE sims ADD COLUMN server_number integer CHECK (server_number >= 1 AND server_number <= 12);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sims_server_number ON sims(server_number);
