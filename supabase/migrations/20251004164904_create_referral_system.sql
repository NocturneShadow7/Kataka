/*
  # Create Referral System

  ## 1. Updates to Existing Tables
  
  ### `profiles`
  - Add `trusted` (boolean) - Indicates if user is trusted
  - Add `subscription_fee` (numeric) - Monthly subscription fee (4.99 for non-trusted, 0 for trusted)
  - Add `subscription_expires_at` (timestamptz) - Expiration date for subscription

  ## 2. New Tables

  ### `referral_codes`
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key to auth.users) - Owner of the code
  - `code` (text, unique) - The referral code
  - `code_type` (text) - Type: 'trusted' (free) or 'lowcost' (0.99€)
  - `is_active` (boolean) - Active/inactive status
  - `uses_count` (integer) - Number of times used
  - `created_at` (timestamptz)

  ### `referrals`
  - `id` (uuid, primary key)
  - `referrer_id` (uuid) - User who referred
  - `referred_id` (uuid) - User who was referred
  - `referral_code` (text) - Code used
  - `discount_applied` (numeric) - Discount amount (2.99, 2.00, or 0)
  - `created_at` (timestamptz)

  ## 3. Security
  - Enable RLS on all tables
  - Add policies for users to manage their codes
  - Add policies for admins to view all referrals
*/

-- Add columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'trusted'
  ) THEN
    ALTER TABLE profiles ADD COLUMN trusted boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_fee'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_fee numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_expires_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_expires_at timestamptz;
  END IF;
END $$;

-- Create referral_codes table
CREATE TABLE IF NOT EXISTS referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  code_type text NOT NULL CHECK (code_type IN ('trusted', 'lowcost')),
  is_active boolean DEFAULT true,
  uses_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

-- Users can view their own referral codes
CREATE POLICY "Users can view own referral codes"
  ON referral_codes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own referral codes
CREATE POLICY "Users can create own referral codes"
  ON referral_codes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own referral codes
CREATE POLICY "Users can update own referral codes"
  ON referral_codes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can view all referral codes
CREATE POLICY "Admins can view all referral codes"
  ON referral_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Anyone can view active referral codes (for validation)
CREATE POLICY "Anyone can view active codes for validation"
  ON referral_codes FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  discount_applied numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(referred_id)
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals (both as referrer and referred)
CREATE POLICY "Users can view own referrals"
  ON referrals FOR SELECT
  TO authenticated
  USING (
    referrer_id = auth.uid() OR referred_id = auth.uid()
  );

-- System can insert referrals
CREATE POLICY "System can insert referrals"
  ON referrals FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admins can view all referrals
CREATE POLICY "Admins can view all referrals"
  ON referrals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can delete referrals
CREATE POLICY "Admins can delete referrals"
  ON referrals FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);

-- Create function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(user_full_name text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_code text;
  final_code text;
  counter integer := 0;
BEGIN
  -- Generate base code from name (first 4 chars + random)
  base_code := UPPER(SUBSTRING(REGEXP_REPLACE(user_full_name, '[^a-zA-Z]', '', 'g'), 1, 4));
  IF LENGTH(base_code) < 4 THEN
    base_code := LPAD(base_code, 4, 'X');
  END IF;
  
  -- Add random numbers
  final_code := base_code || LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
  
  -- Check uniqueness and increment if needed
  WHILE EXISTS (SELECT 1 FROM referral_codes WHERE code = final_code) LOOP
    counter := counter + 1;
    final_code := base_code || LPAD((FLOOR(RANDOM() * 10000) + counter)::text, 4, '0');
    IF counter > 100 THEN
      -- Fallback to completely random
      final_code := 'REF' || LPAD(FLOOR(RANDOM() * 100000)::text, 5, '0');
    END IF;
  END LOOP;
  
  RETURN final_code;
END;
$$;
