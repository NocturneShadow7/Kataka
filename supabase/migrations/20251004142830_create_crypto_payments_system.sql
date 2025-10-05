/*
  # Crypto Payment Auto-Detection System

  1. New Tables
    - `crypto_wallets`
      - `id` (uuid, primary key)
      - `crypto_type` (text) - BTC, ETH, USDT-TRON
      - `address` (text, unique) - Crypto wallet address
      - `is_active` (boolean) - Available for use
      - `created_at` (timestamp)
    
    - `crypto_payment_checks`
      - `id` (uuid, primary key)
      - `payment_id` (uuid, foreign key to payments)
      - `expected_amount` (numeric)
      - `received_amount` (numeric, nullable)
      - `crypto_address` (text)
      - `transaction_hash` (text, nullable)
      - `status` (text) - pending, confirmed, expired
      - `last_checked_at` (timestamp, nullable)
      - `confirmed_at` (timestamp, nullable)
      - `created_at` (timestamp)

  2. Changes
    - Add unique addresses pool for crypto payments
    - Track payment verification status
    - Enable automatic payment confirmation

  3. Security
    - Enable RLS on both tables
    - Clients can only view their own payment checks
    - Admins can view and manage all
*/

-- Create crypto_wallets table
CREATE TABLE IF NOT EXISTS crypto_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crypto_type text NOT NULL CHECK (crypto_type IN ('BTC', 'ETH', 'USDT-TRON')),
  address text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create crypto_payment_checks table
CREATE TABLE IF NOT EXISTS crypto_payment_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES payments(id) ON DELETE CASCADE,
  expected_amount numeric(20, 8) NOT NULL,
  received_amount numeric(20, 8),
  crypto_address text NOT NULL,
  crypto_type text NOT NULL,
  transaction_hash text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'expired', 'underpaid', 'overpaid')),
  last_checked_at timestamptz,
  confirmed_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE crypto_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_payment_checks ENABLE ROW LEVEL SECURITY;

-- Crypto wallets policies (admin only)
CREATE POLICY "Admins can view all crypto wallets"
  ON crypto_wallets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage crypto wallets"
  ON crypto_wallets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Crypto payment checks policies
CREATE POLICY "Users can view own payment checks"
  ON crypto_payment_checks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payments p
      JOIN orders o ON o.id = p.order_id
      WHERE p.id = crypto_payment_checks.payment_id
      AND o.client_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all payment checks"
  ON crypto_payment_checks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert payment checks"
  ON crypto_payment_checks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update payment checks"
  ON crypto_payment_checks FOR UPDATE
  TO authenticated
  USING (true);

-- Insert default crypto wallet addresses (à remplacer par les vraies adresses)
INSERT INTO crypto_wallets (crypto_type, address) VALUES
  ('BTC', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'),
  ('ETH', '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'),
  ('USDT-TRON', 'TYs8a6bPkJhXp5RiQXXGGTqLvfhXCqZ3Hs')
ON CONFLICT (address) DO NOTHING;