/*
  # Ajouter système de périodes d'abonnement avec réductions

  1. Nouvelles Tables
    - `subscription_periods` : Définit les périodes disponibles et leurs réductions
      - `id` (uuid, primary key)
      - `months` (integer) - Nombre de mois (1-12)
      - `base_discount_percent` (numeric) - Réduction de base en %
      - `description` (text)
      - `is_active` (boolean)

  2. Modifications
    - Ajouter `subscription_months` dans order_items (durée choisie)
    - Ajouter `discount_percent` dans order_items (réduction appliquée)
    - Ajouter `original_price` dans order_items (prix avant réduction)
    - Les calculs de réduction se feront côté application

  3. Sécurité
    - RLS activée sur subscription_periods
    - Policies pour lecture publique et gestion admin
*/

-- Créer la table subscription_periods
CREATE TABLE IF NOT EXISTS subscription_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  months integer NOT NULL UNIQUE,
  base_discount_percent numeric NOT NULL DEFAULT 0,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_months CHECK (months >= 1 AND months <= 12),
  CONSTRAINT valid_discount CHECK (base_discount_percent >= 0 AND base_discount_percent <= 100)
);

-- Activer RLS sur subscription_periods
ALTER TABLE subscription_periods ENABLE ROW LEVEL SECURITY;

-- Policies pour subscription_periods (lecture publique, modification admin)
CREATE POLICY "Anyone can view active subscription periods"
  ON subscription_periods FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage subscription periods"
  ON subscription_periods FOR ALL
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

-- Ajouter colonnes à order_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'subscription_months'
  ) THEN
    ALTER TABLE order_items ADD COLUMN subscription_months integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'discount_percent'
  ) THEN
    ALTER TABLE order_items ADD COLUMN discount_percent numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'original_price'
  ) THEN
    ALTER TABLE order_items ADD COLUMN original_price numeric;
  END IF;
END $$;

-- Ajouter durée d'abonnement dans sims
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sims' AND column_name = 'subscription_months'
  ) THEN
    ALTER TABLE sims ADD COLUMN subscription_months integer DEFAULT 1;
  END IF;
END $$;

-- Insérer les périodes d'abonnement par défaut avec réductions progressives
INSERT INTO subscription_periods (months, base_discount_percent, description) VALUES
  (1, 0, 'Paiement mensuel'),
  (2, 5, '2 mois - 5% de réduction'),
  (3, 8, '3 mois - 8% de réduction'),
  (6, 12, '6 mois - 12% de réduction'),
  (12, 20, '1 an - 20% de réduction')
ON CONFLICT (months) DO NOTHING;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS subscription_periods_months_idx ON subscription_periods(months);
CREATE INDEX IF NOT EXISTS order_items_subscription_months_idx ON order_items(subscription_months);
